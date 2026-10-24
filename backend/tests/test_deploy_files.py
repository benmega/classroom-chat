"""Keep the deploy files in step with the app.

deploy.sh, the deploy workflows and the nginx config run on the production host
or in GitHub Actions, so CI cannot execute them. These checks read them as text
and pin the properties that have gone wrong before.
"""

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DEPLOY_SH = REPO_ROOT / "deploy.sh"
DEPLOY_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "deploy.yml"
NGINX_DIR = REPO_ROOT / "infrastructure" / "nginx"
NGINX_API_CONF = NGINX_DIR / "api-blossom.benmega.com.conf"

pytestmark = pytest.mark.skipif(
    not DEPLOY_SH.exists(), reason="repository deploy files are not present"
)


def _text(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def test_deploy_sh_does_not_build_or_host_the_frontend():
    """The SPA is built by deploy-frontend.yml and served from S3 + CloudFront only."""
    script = _text(DEPLOY_SH)

    assert "npm " not in script
    assert "blossom-frontend" not in script
    assert "nginx/blossom.benmega.com.conf" not in script
    assert not (NGINX_DIR / "blossom.benmega.com.conf").exists()
    # The API site is still installed on every deploy.
    assert "api-blossom.benmega.com.conf" in script


def test_deploy_sh_keeps_its_app_processes_from_starting_the_scheduler():
    """The bootstrap and seed processes load the whole app: only gunicorn may run the cleanup job."""
    script = _text(DEPLOY_SH)

    export = script.index("export SCHEDULER_ENABLED=0")
    first_app_process = script.index("from main import app")
    seed = script.index("-m flask seed")
    service_restart = script.rindex('systemctl restart "$SERVICE_NAME"')

    assert export < first_app_process < seed < service_restart
    # The export lives in the database subshell, which is closed before the restart.
    assert "\n)\n" in script[seed:service_restart]


@pytest.mark.skipif(not DEPLOY_WORKFLOW.exists(), reason="deploy workflow is not present")
def test_deploy_workflow_restricts_the_env_file_before_writing_secrets():
    """backend/.env holds the production secrets: owner-only, set before they are written."""
    workflow = _text(DEPLOY_WORKFLOW)

    restrict = workflow.index('chmod 600 "$ENV_FILE"')
    write = workflow.index('} > "$ENV_FILE"')

    assert restrict < write
    assert '> "$APP_DIR/backend/.env"' not in workflow


@pytest.mark.skipif(not NGINX_API_CONF.exists(), reason="nginx config is not present")
def test_nginx_proxies_exactly_the_url_prefixes_the_app_serves(app):
    """A prefix missing from nginx never reaches Flask; a stale one proxies a path nothing serves."""
    match = re.search(r"location ~ \^/\(([^)]*)\)\(/\|\$\)", _text(NGINX_API_CONF))
    assert match, "API proxy location not found in the nginx config"
    proxied = set(match.group(1).split("|"))

    served = {rule.rule.strip("/").split("/")[0] for rule in app.url_map.iter_rules()}
    # Not proxied on purpose: the root and the SPA catch-all (the frontend is on
    # S3), Flask's own /static, and /dev-login (development only).
    served -= {"", "<path:path>", "static", "dev-login"}

    assert proxied == served
