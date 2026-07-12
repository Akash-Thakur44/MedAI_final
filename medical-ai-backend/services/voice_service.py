import google.generativeai as genai
# pyrefly: ignore [missing-import]
import edge_tts
import asyncio
import uuid
import os

TEMP_DIR = "temp_voice"
os.makedirs(TEMP_DIR, exist_ok=True)

# Voice mappings for edge-tts
VOICE_MAP = {
    "en": "en-IN-NeerjaNeural",
    "hi": "hi-IN-SwaraNeural",
    "bn": "bn-IN-TanishaaNeural",
    "hinglish": "en-IN-NeerjaNeural",
    "benglish": "en-IN-NeerjaNeural",
    "auto": "en-IN-NeerjaNeural"
}

def get_voice(language: str) -> str:
    """Helper to find the best edge-tts voice matching the language"""
    if not language:
        return VOICE_MAP["en"]
    
    lang = language.lower().strip()
    if lang in VOICE_MAP:
        return VOICE_MAP[lang]
    
    # Try the prefix (e.g. 'en-US' -> 'en')
    prefix = lang.split('-')[0]
    if prefix in VOICE_MAP:
        return VOICE_MAP[prefix]
    
    return VOICE_MAP["en"]

class VoiceService:

    @staticmethod
    def transcribe(audio_path):
        """
        Transcribe audio file using Google Gemini API.
        This provides high accuracy and support for multiple languages without heavy local models.
        """
        try:
            # Initialize Gemini API key
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                return {
                    "success": False,
                    "text": "",
                    "language": "en",
                    "error": "GEMINI_API_KEY is not set"
                }
            
            genai.configure(api_key=api_key)

            # Determine mime type from extension
            ext = os.path.splitext(audio_path)[1].lower()
            mime_type = "audio/webm"
            if ext == ".wav":
                mime_type = "audio/wav"
            elif ext == ".mp3":
                mime_type = "audio/mp3"
            elif ext == ".m4a":
                mime_type = "audio/m4a"
            elif ext == ".ogg":
                mime_type = "audio/ogg"

            # Read audio file bytes
            with open(audio_path, 'rb') as f:
                audio_bytes = f.read()

            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content([
                {
                    "mime_type": mime_type,
                    "data": audio_bytes
                },
                "Transcribe this audio file exactly as spoken. Do not translate. Output ONLY the transcription text, nothing else. If the audio contains no speech or only noise, output an empty string."
            ])

            text = response.text.strip() if response and response.text else ""

            return {
                "success": True,
                "text": text,
                "language": "auto"
            }

        except Exception as e:
            print(f"[TRANSCRIBE ERROR] {str(e)}")
            return {
                "success": False,
                "text": "",
                "language": "en",
                "error": str(e)
            }

    @staticmethod
    def synthesize(text, language="en"):
        """
        Synthesize text into speech using edge-tts.
        Outputs an MP3 file with high quality and low latency.
        """
        if not text or not text.strip():
            return None

        # Clean text slightly (e.g. limit length to prevent timeout)
        text = text[:800].strip()

        file_name = f"{uuid.uuid4()}.mp3"
        output_path = os.path.join(TEMP_DIR, file_name)

        voice = get_voice(language)

        async def run_tts():
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)

        try:
            # Run the async text-to-speech task in a new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(run_tts())
            loop.close()
            return output_path
        except Exception as e:
            print(f"[TTS SYNTHESIS ERROR] {str(e)}")
            return None