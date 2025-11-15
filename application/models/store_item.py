import enum
from application.extensions import db
from sqlalchemy.types import TypeDecorator, String

# Define the fulfillment types
class FulfillmentType(enum.Enum):
    PHYSICAL = "physical"      # Requires admin action (e.g., battery, headphones)
    AUTOMATED = "automated"    # System grants benefit immediately (e.g., chat_font)
    CUSTOM_INFO = "custom_info"  # Requires follow-up from user (e.g., custom_print)

class StringEnum(TypeDecorator):
    impl = String(50)  # Underlying type in the DB is a String
    cache_ok = True  # The type is cacheable

    def __init__(self, enum_type, *args, **kwargs):
        super(StringEnum, self).__init__(*args, **kwargs)
        self._enum_type = enum_type

    def process_bind_param(self, value, dialect):
        # Convert Enum object to string *before* saving to DB
        if isinstance(value, self._enum_type):
            return value.value
        return value

    def process_result_value(self, value, dialect):
        # Convert string from DB back into Enum object
        if value is not None:
            return self.python_type(value)
        return value

    @property
    def python_type(self):
        return self._enum_type
# --- END NEW CUSTOM TYPE ---


class StoreItem(db.Model):
    __tablename__ = "store_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    base_price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)

    # --- UPDATED COLUMN DEFINITION ---
    # We now use our new custom StringEnum type
    fulfillment_type = db.Column(
        StringEnum(FulfillmentType),  # Use our custom type
        nullable=False,
        default=FulfillmentType.PHYSICAL
    )

    def __repr__(self):
        return f"<StoreItem {self.name}>"