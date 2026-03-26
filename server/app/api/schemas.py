import re
from datetime import datetime


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ValidationError(Exception):
    def __init__(self, message, details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


def _parse_float(value, field_name, min_value=None, max_value=None, required=True):
    if value is None:
        if required:
            raise ValidationError(f"'{field_name}' es obligatorio")
        return None

    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"'{field_name}' debe ser un numero valido")

    if min_value is not None and parsed < min_value:
        raise ValidationError(f"'{field_name}' debe ser >= {min_value}")
    if max_value is not None and parsed > max_value:
        raise ValidationError(f"'{field_name}' debe ser <= {max_value}")

    return parsed


def _parse_int(value, field_name, min_value=None, max_value=None, required=True):
    if value is None:
        if required:
            raise ValidationError(f"'{field_name}' es obligatorio")
        return None

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError(f"'{field_name}' debe ser un numero entero")

    if min_value is not None and parsed < min_value:
        raise ValidationError(f"'{field_name}' debe ser >= {min_value}")
    if max_value is not None and parsed > max_value:
        raise ValidationError(f"'{field_name}' debe ser <= {max_value}")

    return parsed


def _parse_str(value, field_name, min_len=None, max_len=None, required=True):
    if value is None:
        if required:
            raise ValidationError(f"'{field_name}' es obligatorio")
        return None

    parsed = str(value).strip()
    if required and not parsed:
        raise ValidationError(f"'{field_name}' no puede estar vacio")

    if min_len is not None and len(parsed) < min_len:
        raise ValidationError(f"'{field_name}' debe tener al menos {min_len} caracteres")
    if max_len is not None and len(parsed) > max_len:
        raise ValidationError(f"'{field_name}' debe tener como maximo {max_len} caracteres")

    return parsed


def _parse_email(value):
    email = _parse_str(value, "email", min_len=5, max_len=120)
    if not EMAIL_REGEX.match(email):
        raise ValidationError("'email' debe ser un correo electronico valido")
    return email.lower()


def _parse_location(value):
    location = _parse_str(value, "location", min_len=3, max_len=80)
    parts = [part.strip() for part in location.split(",")]
    if len(parts) != 2:
        raise ValidationError("'location' debe tener el formato 'lat,lng'")

    lat = _parse_float(parts[0], "location.lat", min_value=-90, max_value=90)
    lng = _parse_float(parts[1], "location.lng", min_value=-180, max_value=180)
    return lat, lng


class AirLatestQuerySchema:
    @staticmethod
    def validate(query_args):
        return {
            "lat": _parse_float(query_args.get("lat"), "lat", min_value=-90, max_value=90),
            "lng": _parse_float(query_args.get("lng"), "lng", min_value=-180, max_value=180),
        }


class WeatherLatestQuerySchema:
    @staticmethod
    def validate(query_args):
        lat = query_args.get("lat", -16.409)
        lng = query_args.get("lng", -71.5375)
        return {
            "lat": _parse_float(lat, "lat", min_value=-90, max_value=90),
            "lng": _parse_float(lng, "lng", min_value=-180, max_value=180),
        }


class SubscriptionSchema:
    @staticmethod
    def validate(payload):
        if not isinstance(payload, dict):
            raise ValidationError("El cuerpo JSON es obligatorio")

        first_name = _parse_str(payload.get("firstName"), "firstName", min_len=2, max_len=40)
        last_name = _parse_str(payload.get("lastName"), "lastName", min_len=2, max_len=40)
        age = _parse_int(payload.get("age"), "age", min_value=1, max_value=120)
        email = _parse_email(payload.get("email"))
        lat, lng = _parse_location(payload.get("location"))

        return {
            "first_name": first_name,
            "last_name": last_name,
            "age": age,
            "email": email,
            "latitude": lat,
            "longitude": lng,
        }


class CitiesSearchSchema:
    @staticmethod
    def validate(query_args):
        query = _parse_str(query_args.get("q"), "q", min_len=2, max_len=80)
        limit = _parse_int(query_args.get("limit", 10), "limit", min_value=1, max_value=50)
        return {"query": query, "limit": limit}


class HistoricalMerra2QuerySchema:
    @staticmethod
    def validate(query_args):
        lat = _parse_float(query_args.get("lat"), "lat", min_value=-90, max_value=90)
        lng = _parse_float(query_args.get("lng"), "lng", min_value=-180, max_value=180)
        date_str = _parse_str(query_args.get("date"), "date", min_len=10, max_len=10)
        hour = _parse_int(query_args.get("hour", 12), "hour", min_value=0, max_value=23)

        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise ValidationError("'date' debe tener el formato YYYY-MM-DD")

        return {
            "lat": lat,
            "lng": lng,
            "date": date_str,
            "hour": hour,
        }