import logging

from flask import Blueprint, url_for
from flask import request, jsonify, render_template
from flask import session, flash, redirect
from flask_wtf import FlaskForm
from wtforms import IntegerField, FieldList, FormField, SubmitField
from wtforms.validators import DataRequired, NumberRange

from application import db
from application.models.duck_trade import DuckTradeLog

duck_trade = Blueprint('duck_trade', __name__, template_folder='templates')
logging.basicConfig(level=logging.INFO)



class BitDuckForm(FlaskForm):
    """Sub-form for Bit Ducks selection."""
    bit_ducks = FieldList(IntegerField('Bit Duck Count',
                                       default=0,
                                       validators=[NumberRange(min=0, message="Count must be non-negative")]),
                          min_entries=7,
                          max_entries=7)


class ByteDuckForm(FlaskForm):
    """Sub-form for Byte Ducks selection."""
    byte_ducks = FieldList(IntegerField('Byte Duck Count',
                                        default=0,
                                        validators=[NumberRange(min=0, message="Count must be non-negative")]),
                           min_entries=7,
                           max_entries=7)



class DuckTradeForm(FlaskForm):
    """Main form for duck trading."""
    digital_ducks = IntegerField('Digital Ducks',
                                 validators=[DataRequired(),
                                             NumberRange(min=1, message="Must trade at least 1 duck")])
    bit_duck_selection = FormField(BitDuckForm)
    byte_duck_selection = FormField(ByteDuckForm)
    submit = SubmitField('Submit Request')


def to_binary(costs_dict):
    """Convert dictionary values to binary."""
    return {key: str(bin(value))[2:] for key, value in costs_dict.items()}

@duck_trade.route('/')
def index():
    form = DuckTradeForm()
    return render_template('bit_shift.html', form=form)


@duck_trade.route('/submit_trade', methods=['POST'])
def submit_trade():
    form = DuckTradeForm()
    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"

    if not form.validate_on_submit():
        error_msg = "Error: Check your inputs."
        if is_ajax:
            return jsonify({'status': 'error', 'message': error_msg, 'errors': form.errors}), 400
        flash(error_msg, "danger")
        return redirect(url_for('duck_trade.index'))

    try:
        userid = session.get('user')
        if not userid:
            msg = "You must be logged in."
            if is_ajax: return jsonify({'status': 'error', 'message': msg}), 403
            flash(msg, "warning")
            return redirect(url_for('duck_trade.index'))

        from application import User
        user = User.query.get(userid)

        if is_ajax and request.is_json:
            data = request.get_json()
            d_ducks = int(data.get("digital_ducks", 0))
            bit_ducks = data.get("bit_ducks", [])
            byte_ducks = data.get("byte_ducks", [])
        else:
            d_ducks = form.digital_ducks.data
            bit_ducks = []
            byte_ducks = []

        trade = DuckTradeLog(
            username=user.username,
            digital_ducks=d_ducks,
            bit_ducks=bit_ducks,
            byte_ducks=byte_ducks,
            status="pending"
        )
        db.session.add(trade)
        db.session.commit()

        msg = "Trade submitted for approval."

        # 4. The AJAX response contains the message, YOUR JS MUST DISPLAY THIS
        if is_ajax:
            return jsonify({'status': 'success', 'message': msg})

        flash(msg, "success")
        return redirect(url_for('duck_trade.index'))

    except Exception as e:
        db.session.rollback()
        # logging.error(f"Trade Error: {e}")
        if is_ajax:
            return jsonify({'status': 'error', 'message': "Server Error"}), 500
        flash("An unexpected error occurred.", "danger")
        return redirect(url_for('duck_trade.index'))
# @duck_trade.route('/submit_trade', methods=['POST'])
# def submit_trade():
#     form = DuckTradeForm()
#
#     # Determine if it's an AJAX request
#     is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"
#
#     if not form.validate_on_submit():
#         error_message = "There was an error with your trade submission. Please check your inputs."
#         if is_ajax:
#             return jsonify({'status': 'error', 'message': error_message, 'errors': form.errors}), 400
#         flash(error_message, "danger")
#         return redirect(url_for('duck_trade.index'))
#
#     try:
#         userid = session.get('user')
#         if not userid:
#             error_message = "You must be logged in to submit a trade."
#             if is_ajax:
#                 return jsonify({'status': 'error', 'message': error_message}), 403
#             flash(error_message, "warning")
#             return redirect(url_for('duck_trade.index'))
#
#         from application import User
#         user = User.query.filter_by(id=userid).first()
#
#
#         # Extract trade details
#         request_data = request.get_json()
#         digital_ducks = int(request_data.get("digital_ducks", 0))
#         bit_ducks = request_data["bit_ducks"]
#         byte_ducks = request_data["byte_ducks"]
#
#         trade = DuckTradeLog(
#             username=user.username,
#             digital_ducks=digital_ducks,
#             bit_ducks=bit_ducks,
#             byte_ducks=byte_ducks,
#             status="pending"
#         )
#         db.session.add(trade)
#         db.session.commit()
#
#         success_message = "Your trade has been submitted for admin approval."
#         if is_ajax:
#             return jsonify({'status': 'success', 'message': success_message})
#
#         flash(success_message, "success")
#         return redirect(url_for('duck_trade.index'))
#
#     except Exception as e:
#         db.session.rollback()
#         error_message = "An unexpected error occurred. Please try again."
#         if is_ajax:
#             return jsonify({'status': 'error', 'message': error_message}), 500
#         flash(error_message, "danger")
#         return redirect(url_for('duck_trade.index'))


@duck_trade.route('/bit_shift', methods=['GET'])
def bit_shift():
    form = DuckTradeForm()
    return render_template('bit_shift.html', form=form)
