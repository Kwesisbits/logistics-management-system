from datetime import UTC, datetime

from app.models.schemas import RetrievedDocument

SYSTEM_PROMPT_TEMPLATE = """You are LogiFlow AI, an operational assistant for logistics and inventory.
Answer using only provided operational context. If data is missing, say so.
Current date and time: {now}
User role: {role}
{warehouse_scope}
"""


class ContextBuilder:
    def build_prompt_context(
        self,
        retrieved_docs: list[RetrievedDocument],
        user_role: str,
        warehouse_id: str | None,
    ) -> str:
        warehouse_scope = f"Warehouse scope: {warehouse_id}" if warehouse_id else "Warehouse scope: all"
        if not retrieved_docs:
            context = "No recent operational events match this query."
        else:
            sorted_docs = sorted(retrieved_docs, key=lambda d: d.similarity, reverse=True)
            context = "\n".join(
                f"[{d.event_type}] {d.created_at.strftime('%Y-%m-%d %H:%M')}: {d.content}" for d in sorted_docs[:8]
            )

        system = SYSTEM_PROMPT_TEMPLATE.format(
            now=datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
            role=user_role,
            warehouse_scope=warehouse_scope,
        )
        return f"{system}\n=== OPERATIONAL CONTEXT ===\n{context}\n=== END CONTEXT ==="

