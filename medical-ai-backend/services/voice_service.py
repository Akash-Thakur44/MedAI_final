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

CHUNK_SIZE = 1500

def split_text_into_chunks(text, max_length=CHUNK_SIZE):
    if len(text) <= max_length:
        return [text]
    chunks = []
    remaining = text
    while remaining:
        if len(remaining) <= max_length:
            chunks.append(remaining)
            break
        chunk = remaining[:max_length]
        last_para = chunk.rfind('\n\n')
        if last_para > max_length * 0.3:
            chunks.append(remaining[:last_para].strip())
            remaining = remaining[last_para:].strip()
            continue
        last_newline = chunk.rfind('\n')
        if last_newline > max_length * 0.3:
            chunks.append(remaining[:last_newline].strip())
            remaining = remaining[last_newline:].strip()
            continue
        last_period = chunk.rfind('. ')
        last_excl = chunk.rfind('! ')
        last_ques = chunk.rfind('? ')
        last_sent = max(last_period, last_excl, last_ques)
        if last_sent > max_length * 0.3:
            chunks.append(remaining[:last_sent + 1].strip())
            remaining = remaining[last_sent + 1:].strip()
            continue
        last_comma = chunk.rfind(', ')
        if last_comma > max_length * 0.3:
            chunks.append(remaining[:last_comma + 1].strip())
            remaining = remaining[last_comma + 1:].strip()
            continue
        last_space = chunk.rfind(' ')
        if last_space > max_length * 0.3:
            chunks.append(remaining[:last_space].strip())
            remaining = remaining[last_space:].strip()
            continue
        chunks.append(remaining[:max_length].strip())
        remaining = remaining[max_length:].strip()
    return [c for c in chunks if c]


class VoiceService:

    @staticmethod
    def transcribe(audio_path):
        try:
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                return {
                    "success": False,
                    "text": "",
                    "language": "en",
                    "error": "GEMINI_API_KEY is not set"
                }

            genai.configure(api_key=api_key, transport="rest")

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
        if not text or not text.strip():
            return None

        text = text.strip()
        voice = get_voice(language)

        if len(text) <= CHUNK_SIZE:
            return VoiceService._synthesize_chunk(text, voice)

        chunks = split_text_into_chunks(text)
        print(f"[TTS] Split {len(text)} chars into {len(chunks)} chunks")

        chunk_paths = []
        for i, chunk in enumerate(chunks):
            path = VoiceService._synthesize_chunk(chunk, voice)
            if path:
                chunk_paths.append(path)
            else:
                print(f"[TTS] Failed to synthesize chunk {i+1}/{len(chunks)}")

        if not chunk_paths:
            return None

        if len(chunk_paths) == 1:
            return chunk_paths[0]

        final_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.mp3")
        success = VoiceService._concatenate_audio(chunk_paths, final_path)

        for cp in chunk_paths:
            try:
                os.remove(cp)
            except OSError:
                pass

        if success:
            return final_path
        else:
            return chunk_paths[-1] if chunk_paths else None

    @staticmethod
    def _synthesize_chunk(text, voice):
        text = text[:CHUNK_SIZE].strip()
        if not text:
            return None

        file_name = f"{uuid.uuid4()}.mp3"
        output_path = os.path.join(TEMP_DIR, file_name)

        async def run_tts():
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(run_tts())
            loop.close()

            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return output_path
            return None
        except Exception as e:
            print(f"[TTS CHUNK ERROR] {str(e)}")
            return None

    @staticmethod
    def _concatenate_audio(audio_paths, output_path):
        if not audio_paths:
            return False

        try:
            import subprocess
            list_file = os.path.join(TEMP_DIR, f"concat_{uuid.uuid4()}.txt")
            with open(list_file, 'w') as f:
                for path in audio_paths:
                    safe_path = path.replace('\\', '/')
                    f.write(f"file '{safe_path}'\n")

            result = subprocess.run(
                [
                    'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                    '-i', list_file, '-c', 'copy', output_path
                ],
                capture_output=True,
                timeout=60
            )

            try:
                os.remove(list_file)
            except OSError:
                pass

            if result.returncode == 0 and os.path.exists(output_path):
                return True

        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        try:
            with open(output_path, 'wb') as outfile:
                for path in audio_paths:
                    with open(path, 'rb') as infile:
                        outfile.write(infile.read())
            return os.path.exists(output_path) and os.path.getsize(output_path) > 0
        except Exception as e:
            print(f"[AUDIO CONCAT ERROR] {str(e)}")
            return False