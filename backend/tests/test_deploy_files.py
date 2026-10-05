"""Keep the deploy files in step with the app.

deploy.sh, the deploy workflows and the nginx config run on the production host
or in GitHub Actions, so CI cannot execute them. These checks read them as text
and pin the properties that have gone wrong before.
"""

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DEPLOY_SH = REPO_ROOT / "deploy.sh"
NGINX_DIR = REPO_ROOT / "infrastructure" / "nginx"

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
