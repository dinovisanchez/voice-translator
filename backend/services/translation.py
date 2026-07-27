from __future__ import annotations

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline


class TranslationService:
    def __init__(self) -> None:
        self._pipeline = None
        self._model_name = None

    def _get_pipeline(self):
        if self._pipeline is None:
            model_name = self._resolve_model_name("es", "en")
            self._model_name = model_name
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            self._pipeline = pipeline("translation", model=model, tokenizer=tokenizer, device=-1)
        return self._pipeline

    def _resolve_model_name(self, source_lang: str, target_lang: str) -> str:
        mapping = {
            ("es", "en"): "Helsinki-NLP/opus-mt-es-en",
            ("fr", "en"): "Helsinki-NLP/opus-mt-fr-en",
            ("de", "en"): "Helsinki-NLP/opus-mt-de-en",
            ("it", "en"): "Helsinki-NLP/opus-mt-it-en",
            ("pt", "en"): "Helsinki-NLP/opus-mt-pt-en",
            ("nl", "en"): "Helsinki-NLP/opus-mt-nl-en",
            ("ru", "en"): "Helsinki-NLP/opus-mt-ru-en",
            ("zh", "en"): "Helsinki-NLP/opus-mt-zh-en",
            ("ja", "en"): "Helsinki-NLP/opus-mt-ja-en",
            ("ko", "en"): "Helsinki-NLP/opus-mt-ko-en",
            ("ar", "en"): "Helsinki-NLP/opus-mt-ar-en",
        }
        if (source_lang.lower(), target_lang.lower()) not in mapping:
            raise ValueError("Unsupported language pair for local translation")
        return mapping[(source_lang.lower(), target_lang.lower())]

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        pipeline = self._get_pipeline()
        result = pipeline(text, src_lang=source_lang, tgt_lang=target_lang)
        return result[0]["translation_text"]
