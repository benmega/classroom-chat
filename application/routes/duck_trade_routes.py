from flask import Blueprint, render_template, request, jsonify
from flask import Blueprint, render_template, url_for
from flask_wtf import FlaskForm
from wtforms import HiddenField, IntegerField, FieldList, FormField, SubmitField
from wtforms.validators import DataRequired, NumberRange

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

        # Calculate total requested physical ducks
        total_requested = sum(count * (2 ** i) for i, count in enumerate(bit_ducks.values())) + \
                          sum(count * (2 ** (i + 8)) for i, count in enumerate(byte_ducks.values()))

        # Simple validation for testing (ensure digital ducks >= requested physical ducks)
        if total_requested != digital_ducks:
            return jsonify({
                'status': 'error',
                'message': 'The duck amounts do not match.'
            }), 400

        # Log trade details (simulating saving to a database or processing)
        trade_details = {
            'digital_ducks_used': digital_ducks,
            'bit_ducks': bit_ducks,
            'byte_ducks': byte_ducks
        }
        print(trade_details)
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


class BitDuckForm(FlaskForm):
    """Sub-form for Bit Ducks selection."""
    bit_ducks = FieldList(IntegerField('Bit Duck Count',
                                       validators=[NumberRange(min=0, message="Count must be non-negative")]),
                          min_entries=7,  # 7 Bit Ducks for 2^0 to 2^6
                          max_entries=7)


class ByteDuckForm(FlaskForm):
    """Sub-form for Byte Ducks selection."""
    byte_ducks = FieldList(IntegerField('Byte Duck Count',
                                        validators=[NumberRange(min=0, message="Count must be non-negative")]),
                           min_entries=7,  # 7 Byte Ducks for 2^0 to 2^6
                           max_entries=7)


class DuckTradeForm(FlaskForm):
    """Main form for duck trading."""
    hidden_tag = HiddenField()
    digital_ducks = IntegerField('Digital Ducks',
                                 validators=[DataRequired(),
                                             NumberRange(min=1, message="Must trade at least 1 duck")])
    bit_duck_selection = FormField(BitDuckForm)
    byte_duck_selection = FormField(ByteDuckForm)
    submit = SubmitField('Submit Request')


@duck_trade_bp.route('/bit_shift', methods=['GET', 'POST'])
def bit_shift():
    form = DuckTradeForm()

    if form.validate_on_submit():
        # Process form data here
        return "Form submitted successfully!"  # Replace with actual logic

    return render_template('bit_shift.html', form=form)