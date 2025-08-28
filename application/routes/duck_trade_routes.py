import logging

from flask import Blueprint, url_for
from flask import request, jsonify, render_template
from flask import session, flash, redirect
from flask_wtf import FlaskForm
from wtforms import IntegerField, FieldList, FormField, SubmitField
from wtforms.validators import DataRequired, NumberRange

from application import db
from application.models.duck_trade import DuckTradeLog

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
    form = DuckTradeForm()
    return render_template('bit_shift.html', form=form)

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
        return redirect(url_for('duck_trade_bp.index'))

    try:
        username = session.get('user')
        if not username:
            error_message = "You must be logged in to submit a trade."
            if is_ajax:
                return jsonify({'status': 'error', 'message': error_message}), 403
            flash(error_message, "warning")
            return redirect(url_for('duck_trade_bp.index'))

        # Extract trade details
        request_data = request.get_json()
        digital_ducks = int(request_data.get("digital_ducks", 0))
        bit_ducks = request_data["bit_ducks"]
        byte_ducks = request_data["byte_ducks"]

        trade = DuckTradeLog(
            username=username,
            digital_ducks=digital_ducks,
            bit_ducks=bit_ducks,
            byte_ducks=byte_ducks,
            status="pending"
        )
        db.session.add(trade)
        db.session.commit()

        success_message = "Your trade has been submitted for admin approval."
        if is_ajax:
            return jsonify({'status': 'success', 'message': success_message})

        flash(success_message, "success")
        return redirect(url_for('duck_trade_bp.index'))

    except Exception as e:
        db.session.rollback()
        error_message = "An unexpected error occurred. Please try again."
        if is_ajax:
            return jsonify({'status': 'error', 'message': error_message}), 500
        flash(error_message, "danger")
        return redirect(url_for('duck_trade_bp.index'))


@duck_trade_bp.route('/bit_shift', methods=['GET'])
def bit_shift():
    form = DuckTradeForm()
    return render_template('bit_shift.html', form=form)

#
# @duck_trade_bp.route('/update_trade_status/<int:trade_id>', methods=['POST'])
# def update_trade_status(trade_id):
#     trade = Trade.query.get_or_404(trade_id)
#     new_status = request.form.get('status')
#     if new_status not in ['Pending', 'Completed', 'Cancelled']:
#         flash('Invalid status selected.', 'error')
#         return redirect(url_for('duck_trade_bp.trade_logs'))
#
#     trade.status = new_status
#     db.session.commit()
#     flash('Trade status updated successfully.', 'success')
#     return redirect(url_for('duck_trade_bp.trade_logs'))


# @duck_trade_bp.route('/trade_logs')
# def trade_logs():
#     trades = Trade.query.order_by(Trade.timestamp.desc()).all()
#     return render_template('trade_logs.html', trades=trades)
