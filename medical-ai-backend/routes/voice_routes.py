from flask import Blueprint, request, jsonify, send_file
from services.voice_service import VoiceService
import tempfile
import os

voice_bp = Blueprint("voice", __name__)

@voice_bp.route("/transcribe", methods=["POST"])
def transcribe():

    if "audio" not in request.files:
        return jsonify({
            "success": False,
            "message": "Audio file missing"
        }), 400

    audio = request.files["audio"]

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".webm"
    )

    audio.save(temp_file.name)

    result = VoiceService.transcribe(
        temp_file.name
    )

    os.unlink(temp_file.name)

    return jsonify(result)

"""@voice_bp.route("/speak", methods=["POST"])
def speak():

    data = request.get_json()

    text = data.get("text", "")
    language = data.get("language", "en")

    path = VoiceService.synthesize(
        text=text,
        language=language
    )

    return send_file(
        path,
        mimetype="audio/wav"
    )"""

@voice_bp.route("/speak", methods=["POST"])
def speak():

    data = request.get_json()

    text = data.get("text", "")
    language = data.get("language", "en")

    path = VoiceService.synthesize(
        text=text,
        language=language
    )

    if not path:
        return jsonify({
            "success": False,
            "message": "TTS not configured"
        }), 501

    return send_file(
        path,
        mimetype="audio/mpeg"
    )