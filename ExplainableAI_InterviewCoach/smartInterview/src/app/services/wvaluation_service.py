import os
import json
import re
from typing import List
from google import genai
from models.schemas import Answer, EvaluationResult

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class EvaluationService:
    def evaluate_answers(self, job_role: str, answers: List[Answer]) -> List[EvaluationResult]:
        qa_text = "\n".join(
            [f"Q{a.question_id}: {a.question}\nA{a.question_id}: {a.answer}" for a in answers]
        )

        prompt = f"""You are a strict technical interviewer evaluating answers for a {job_role} position.

Evaluate each answer ONLY on technical correctness. Ignore grammar or communication style.

{qa_text}

Return ONLY a valid JSON array with one object per question:
[
  {{
    "question_id": 1,
    "is_correct": true or false,
    "correct_answer": "brief correct answer in 1-2 sentences"
  }},
  ...
]
No extra text outside the JSON."""

        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-04-17",
            contents=prompt
        )

        raw = response.text.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

        data = json.loads(raw)

        results = []
        for item in data:
            answer = next(a for a in answers if a.question_id == item["question_id"])
            results.append(EvaluationResult(
                question_id=item["question_id"],
                question=answer.question,
                user_answer=answer.answer,
                is_correct=item["is_correct"],
                correct_answer=item["correct_answer"]
            ))
        return results

evaluation_service = EvaluationService()