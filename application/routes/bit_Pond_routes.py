from flask import Blueprint, render_template

# Define the blueprint
bitpond_bp = Blueprint('bitpond_bp', __name__, template_folder='templates')

def to_binary(costs_dict):
    """Convert dictionary values to binary."""
    return {key: str(bin(value))[2:] for key, value in costs_dict.items()}

@bitpond_bp.route('/')
def index():
    # Base 10 cost dictionary
    costs_base10 = {
        'hint_cost': 1,
        'solution_cost': 10,
        'debug_cost': 2,
        'double_ducks_cost': 20,
        'setup_cost': 1,
        'packup_cost': 1,
        'vip_cost': 1000,
        'wallpaper_cost': 100,
        'font_cost': 50,
        'avatar_cost': 200
    }

    # Convert costs to binary
    costs_binary = to_binary(costs_base10)

    return render_template('bit_pond.html', title='bit_Pond', **costs_binary)
