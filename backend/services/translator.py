from __future__ import annotations

from typing import Any, Optional

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


class TranslatorService:
    def __init__(self, model_name: str = "facebook/nllb-200-distilled-600M") -> None:
        self.model_name = model_name
        self._tokenizer: Optional[Any] = None
        self._model: Optional[Any] = None

    def _get_model_and_tokenizer(self) -> tuple[Any, Any]:
        if self._tokenizer is None or self._model is None:
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
            model.eval()
            self._tokenizer = tokenizer
            self._model = model
        return self._tokenizer, self._model

    def _normalize_language(self, language: str) -> str:
        return language.lower().strip()

    def _to_nllb_lang(self, language: str) -> str:
        mapping = {
            "en": "eng_Latn",
            "es": "spa_Latn",
            "fr": "fra_Latn",
            "de": "deu_Latn",
            "it": "ita_Latn",
            "pt": "por_Latn",
            "ru": "rus_Cyrl",
            "ja": "jpn_Jpan",
            "ko": "kor_Hang",
            "zh": "zho_Hans",
        }
        return mapping.get(self._normalize_language(language), self._normalize_language(language))

    def translate_text(self, text: str, source_language: str, target_language: str) -> dict[str, Any]:
        source_lang = self._normalize_language(source_language)
        target_lang = self._normalize_language(target_language)

        if not text.strip():
            return {
                "success": True,
                "original": text,
                "translated": "",
                "source_language": source_language,
                "target_language": target_language,
            }

        if source_lang == target_lang:
            return {
                "success": True,
                "original": text,
                "translated": text,
                "source_language": source_language,
                "target_language": target_language,
            }

        tokenizer, model = self._get_model_and_tokenizer()
        source_code = self._to_nllb_lang(source_lang)
        target_code = self._to_nllb_lang(target_lang)

        if source_code not in tokenizer.lang_code_to_id or target_code not in tokenizer.lang_code_to_id:
            raise ValueError("Unsupported language pair for local translation")

        inputs = tokenizer(text, return_tensors="pt")
        generated_tokens = model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.lang_code_to_id[target_code],
            max_new_tokens=512,
        )
        translated = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]

        return {
            "success": True,
            "original": text,
            "translated": translated,
            "source_language": source_language,
            "target_language": target_language,
        }
