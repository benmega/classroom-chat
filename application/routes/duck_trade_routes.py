from flask import Blueprint, render_template, request, jsonify

# Define the blueprint
duck_trade_bp = Blueprint('duck_trade_bp', __name__, template_folder='templates')

def to_binary(costs_dict):
    """Convert dictionary values to binary."""
    return {key: str(bin(value))[2:] for key, value in costs_dict.items()}

@duck_trade_bp.route('/')
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

@duck_trade_bp.route('/submit_trade', methods=['POST'])
def submit_trade():
    try:
        # Parse the form data
        digital_ducks = int(request.form.get('digital_ducks', 0))
        bit_ducks = {f'bit_duck_{i}': int(request.form.get(f'bit_duck_{i}', 0)) for i in range(7)}
        byte_ducks = {f'byte_duck_{i}': int(request.form.get(f'byte_duck_{i}', 0)) for i in range(7)}

        # Total requested physical ducks
        total_requested = sum(bit_ducks.values()) + sum(byte_ducks.values())

        # Simple validation for testing (ensure digital ducks >= requested physical ducks)
        if total_requested > digital_ducks:
            return jsonify({
                'status': 'error',
                'message': 'You do not have enough digital ducks to complete this trade.'
            }), 400

        # Log trade details (simulating saving to a database or processing)
        trade_details = {
            'digital_ducks_used': digital_ducks,
            'bit_ducks': bit_ducks,
            'byte_ducks': byte_ducks
        }

        # Success response
        return jsonify({
            'status': 'success',
            'message': 'Trade request submitted successfully.',
            'trade_details': trade_details
        }), 200

    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid input: {str(e)}'
        }), 400


@duck_trade_bp.route('/bit_shift', methods=['GET'])
def bit_shift():
    hint_cost = 10
    solution_cost = 50
    debug_cost = 100
    double_ducks_cost = 200
    setup_cost = 300
    vip_cost = 500
    wallpaper_cost = 150
    font_cost = 100
    avatar_cost = 250

    return render_template('bit_shift.html',
                           hint_cost=hint_cost,
                           solution_cost=solution_cost,
                           debug_cost=debug_cost,
                           double_ducks_cost=double_ducks_cost,
                           setup_cost=setup_cost,
                           vip_cost=vip_cost,
                           wallpaper_cost=wallpaper_cost,
                           font_cost=font_cost,
                           avatar_cost=avatar_cost)
