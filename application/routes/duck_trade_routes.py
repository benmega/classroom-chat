from flask import Blueprint, render_template, request, jsonify, session, flash, redirect
from flask import Blueprint, render_template, url_for
from flask_wtf import FlaskForm
from wtforms import HiddenField, IntegerField, FieldList, FormField, SubmitField
from wtforms.validators import DataRequired, NumberRange

from application import db
from application.helpers.db_helpers import get_user
from application.models.trade import Trade

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
    session_username = session.get('user')
    if not session_username:
        return jsonify({'status': 'error', 'message': 'You are not logged in.'}), 400

    user = get_user(session_username)
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found.'}), 404

    try:
        digital_ducks = int(request.form.get('digital_ducks', 0))
        duck_type = request.form.get('duck_type', 'bit')  # 'bit' or 'byte'
        duck_inputs = {f'duck_{i}': int(request.form.get(f'duck_{i}', 0)) for i in range(7)}

        # Calculate total based on the selected type
        if duck_type == 'bit':
            total_requested = sum(count * (2 ** i) for i, count in enumerate(duck_inputs.values()))
        elif duck_type == 'byte':
            total_requested = sum(count * (2 ** (i + 8)) for i, count in enumerate(duck_inputs.values()))
        else:
            return jsonify({'status': 'error', 'message': 'Invalid duck type selected.'}), 400

        if user.ducks < total_requested:
            return jsonify({'status': 'error', 'message': 'You do not have enough ducks.'}), 400

        if total_requested != digital_ducks:
            print(f'{user.username} requested {total_requested} 3D ducks for {digital_ducks} digital ducks.')
            return jsonify({'status': 'error', 'message': 'The duck amounts do not match.'}), 400

        # Subtract ducks and process the trade
        user.ducks -= total_requested
        log_trade(user.id, digital_ducks, duck_inputs, duck_type)  # Log the trade
        db.session.commit()

        return jsonify({'status': 'success', 'message': 'Trade successfully submitted!'}), 200

    except ValueError as e:
        return jsonify({'status': 'error', 'message': f'Invalid input: {str(e)}'}), 400


def log_trade(user_id, digital_ducks, duck_breakdown, duck_type):
    """
    Logs a trade into the database.

    :param user_id: ID of the user making the trade.
    :param digital_ducks: Total number of digital ducks traded.
    :param duck_breakdown: A dictionary representing the duck breakdown (e.g., {'duck_0': 3, 'duck_1': 2}).
    :param duck_type: Type of ducks traded ('bit' or 'byte').
    """
    try:
        trade = Trade(
            user_id=user_id,
            digital_ducks_traded=digital_ducks,
            duck_breakdown=duck_breakdown,
            duck_type=duck_type
***REMOVED***
        db.session.add(trade)
        db.session.commit()
        print(f"Trade logged: User {user_id} traded {digital_ducks} digital ducks as {duck_type} ducks.")
    except Exception as e:
        db.session.rollback()
        print(f"Failed to log trade: {e}")
        raise


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


@duck_trade_bp.route('/update_trade_status/<int:trade_id>', methods=['POST'])
def update_trade_status(trade_id):
    trade = Trade.query.get_or_404(trade_id)
    new_status = request.form.get('status')
    if new_status not in ['Pending', 'Completed', 'Cancelled']:
        flash('Invalid status selected.', 'error')
        return redirect(url_for('duck_trade_bp.trade_logs'))

    trade.status = new_status
    db.session.commit()
    flash('Trade status updated successfully.', 'success')
    return redirect(url_for('duck_trade_bp.trade_logs'))


@duck_trade_bp.route('/trade_logs')
def trade_logs():
    trades = Trade.query.order_by(Trade.timestamp.desc()).all()
    return render_template('trade_logs.html', trades=trades)


import logging

logging.basicConfig(level=logging.INFO)


# @duck_trade_bp.route('/update_trade_status/<int:trade_id>', methods=['POST'])
# def update_trade_status(trade_id):
#     trade = Trade.query.get_or_404(trade_id)
#     old_status = trade.status
#     new_status = request.form.get('status')
#
#     if new_status not in ['Pending', 'Completed', 'Cancelled']:
#         flash('Invalid status selected.', 'error')
#         return redirect(url_for('duck_trade_bp.trade_logs'))
#
#     trade.status = new_status
#     db.session.commit()
#     logging.info(f"Trade ID {trade.id} status changed from {old_status} to {new_status}")
#     flash('Trade status updated successfully.', 'success')
#     return redirect(url_for('duck_trade_bp.trade_logs'))
