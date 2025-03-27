from flask import request, jsonify, session, flash, redirect
from flask import Blueprint, render_template, url_for
from flask_wtf import FlaskForm
from wtforms import HiddenField, IntegerField, FieldList, FormField, SubmitField
from wtforms.validators import DataRequired, NumberRange
import logging
from application import db
from application.models.duck_trade import DuckTradeLog
from application.models.trade import Trade
from flask import request, jsonify, render_template

# Define the blueprint
duck_trade_bp = Blueprint('duck_trade_bp', __name__, template_folder='templates')
logging.basicConfig(level=logging.INFO)



class BitDuckForm(FlaskForm):
    """Sub-form for Bit Ducks selection."""
    bit_ducks = FieldList(IntegerField('Bit Duck Count',
                                       default=0,  # Ensure a default value is set
                                       validators=[NumberRange(min=0, message="Count must be non-negative")]),
                          min_entries=7,  # 7 Bit Ducks for 2^0 to 2^6
                          max_entries=7)


class ByteDuckForm(FlaskForm):
    """Sub-form for Byte Ducks selection."""
    byte_ducks = FieldList(IntegerField('Byte Duck Count',
                                        default=0,  # Ensure a default value is set
                                        validators=[NumberRange(min=0, message="Count must be non-negative")]),
                           min_entries=7,  # 7 Byte Ducks for 2^7 to 2^13
                           max_entries=7)



class DuckTradeForm(FlaskForm):
    """Main form for duck trading."""
    # hidden_tag = HiddenField()
    digital_ducks = IntegerField('Digital Ducks',
                                 validators=[DataRequired(),
                                             NumberRange(min=1, message="Must trade at least 1 duck")])
    bit_duck_selection = FormField(BitDuckForm)
    byte_duck_selection = FormField(ByteDuckForm)
    submit = SubmitField('Submit Request')


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


#
# def test_submit_trade_valid(client, sample_user_with_ducks):
#     with client.session_transaction() as sess:
#         sess['user'] = sample_user_with_ducks.username  # Set the session user
#
#     response = client.post(url_for('duck_trade_bp.submit_trade'), data={
#         'digital_ducks': 3,
#         'duck_type': 'bit',
#         'duck_0': 1,
#         'duck_1': 1,
#         'duck_2': 0,
#         'duck_3': 0,
#         'duck_4': 0,
#         'duck_5': 0,
#         'duck_6': 0
#     })
#
#     assert response.status_code == 200
#     assert response.json['status'] == 'success'



# def log_trade(user_id, digital_ducks, duck_breakdown, duck_type):
#     """
#     Logs a trade into the database.
#
#     :param user_id: ID of the user making the trade.
#     :param digital_ducks: Total number of digital ducks traded.
#     :param duck_breakdown: A dictionary representing the duck breakdown (e.g., {'duck_0': 3, 'duck_1': 2}).
#     :param duck_type: Type of ducks traded ('bit' or 'byte').
#     """
#     try:
#         trade = Trade(
#             user_id=user_id,
#             digital_ducks_traded=digital_ducks,
#             duck_breakdown=duck_breakdown,
#             duck_type=duck_type
# ***REMOVED***
#         db.session.add(trade)
#         db.session.commit()
#         print(f"Trade logged: User {user_id} traded {digital_ducks} digital ducks as {duck_type} ducks.")
#     except Exception as e:
#         db.session.rollback()
#         print(f"Failed to log trade: {e}")
#         raise


# from flask import request, jsonify, render_template, redirect, flash, url_for


@duck_trade_bp.route('/submit_trade', methods=['POST'])
def submit_trade():
    form = DuckTradeForm()

    # Determine if it's an AJAX request
    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"

    if not form.validate_on_submit():
        error_message = "There was an error with your trade submission. Please check your inputs."
        if is_ajax:
            return jsonify({'status': 'error', 'message': error_message, 'errors': form.errors}), 400
        flash(error_message, "danger")
        return redirect(url_for('duck_trade_bp.trade_page'))

    try:
        username = session.get('user')
        if not username:
            error_message = "You must be logged in to submit a trade."
            if is_ajax:
                return jsonify({'status': 'error', 'message': error_message}), 403
            flash(error_message, "warning")
            return redirect(url_for('duck_trade_bp.trade_page'))

        # Extract trade details
        digital_ducks = form.digital_ducks.data
        bit_ducks = [int(request.form.get(f'duck_{i}', 0)) for i in range(7)]
        byte_ducks = [int(request.form.get(f'byte_duck_{i}', 0)) for i in range(7)]

        trade = DuckTradeLog(
            username=username,
            digital_ducks=digital_ducks,
            bit_ducks=bit_ducks,
            byte_ducks=byte_ducks,
            status="pending"
***REMOVED***
        db.session.add(trade)
        db.session.commit()

        success_message = "Your trade has been submitted for admin approval."
        if is_ajax:
            return jsonify({'status': 'success', 'message': success_message})

        flash(success_message, "success")
        return redirect(url_for('duck_trade_bp.trade_page'))

    except Exception as e:
        db.session.rollback()
        error_message = "An unexpected error occurred. Please try again."
        if is_ajax:
            return jsonify({'status': 'error', 'message': error_message}), 500
        flash(error_message, "danger")
        return redirect(url_for('duck_trade_bp.trade_page'))


# @duck_trade_bp.route('/submit_trade', methods=['POST'])
# def submit_trade():
#     form = DuckTradeForm()
#
#     # Debug: Print raw form data
#     print("Received form data:", request.form)
#
#     if not form.validate_on_submit():
#         print("Form validation failed:", form.errors)
#         return jsonify({'status': 'error', 'errors': form.errors}), 400
#
#     try:
#         print("Raw form field data:")
#         print("bit_duck_selection.bit_ducks:", getattr(form.bit_duck_selection, 'bit_ducks', None))
#         print("byte_duck_selection.byte_ducks:", getattr(form.byte_duck_selection, 'byte_ducks', None))
#
#         username = session.get('user')
#         if not username:
#             print("Error: User not authenticated")
#             return jsonify({'status': 'error', 'message': 'User not authenticated'}), 403
#
#         # Debug: Print extracted session username
#         print(f"Authenticated user: {username}")
#
#         # Extract trade details
#         digital_ducks = form.digital_ducks.data
#         bit_ducks = [int(request.form.get(f'duck_{i}', 0)) for i in range(7)]
#         byte_ducks = [int(request.form.get(f'byte_duck_{i}', 0)) for i in range(7)]
#
#         # Debug: Print extracted trade values
#         print(f"Extracted values - Digital Ducks: {digital_ducks}, Bit Ducks: {bit_ducks}, Byte Ducks: {byte_ducks}")
#
#         # Create a trade log entry
#         trade = DuckTradeLog(
#             username=username,
#             digital_ducks=digital_ducks,
#             bit_ducks=bit_ducks,
#             byte_ducks=byte_ducks,
#             status="pending"
# ***REMOVED***
#         db.session.add(trade)
#         db.session.commit()
#
#         # Debug: Print confirmation of trade submission
#         print(f"Trade successfully logged for user: {username}")
#
#         return jsonify({'status': 'success', 'message': 'Trade submitted for admin approval'})
#
#     except Exception as e:
#         print("Unexpected error:", str(e))
#         db.session.rollback()
#         return jsonify({'status': 'error', 'message': 'An unexpected error occurred'}), 500


# @duck_trade_bp.route('/submit_trade', methods=['GET', 'POST'])
# def submit_trade():
#     form = DuckTradeForm()
#
#     if form.validate_on_submit():
#         # Process form data here
#         # Your logic to handle the trade
#         return jsonify({'status': 'success'})  # Return JSON response with status
#
#     return render_template('bit_shift.html', form=form)


@duck_trade_bp.route('/bit_shift', methods=['GET'])
def bit_shift():
    form = DuckTradeForm()
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






