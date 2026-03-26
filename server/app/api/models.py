from app.extensions import db

class Subscriptions(db.Model):
    __tablename__ = "subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(64), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    threshold = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __repr__(self):
        return f"<Subscription {self.email}>"
    
    @staticmethod
    def calculate_threshold(age):
        if age < 13:
            return 50  # Kids - very sensitive
        elif age < 19:
            return 75  # Teenagers - sensitive
        elif age < 65:
            return 100  # Adults - normal
        else:
            return 50  # Seniors - very sensitive

    @property
    def sensitivity_group(self):
        """Determine sensitivity group based on age."""
        if self.age < 13:
            return "Children (High Sensitivity)"
        elif self.age < 19:
            return "Teenagers (Moderate Sensitivity)"
        elif self.age < 65:
            return "Adults (Normal Sensitivity)"
        else:
            return "Seniors (High Sensitivity)"
    
    def to_dict(self):
        return {
            'id': self.id,
            'fullname': self.fullname,
            'age': self.age,
            'email': self.email,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'threshold': self.threshold,
            'sensitivity_group': self.sensitivity_group,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }