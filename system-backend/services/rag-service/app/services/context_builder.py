from datetime import UTC, datetime

from app.models.schemas import RetrievedDocument

SYSTEM_PROMPT_TEMPLATE = """You are LogiFlow AI, an operational assistant for logistics and inventory.
Answer using only provided operational context. If data is missing, say so.
Current date and time: {now}
User role: {role}
{warehouse_scope}
{access_control}
"""


class ContextBuilder:
    ROLE_HIERARCHY = {
        "SUPER_ADMIN": 5,
        "COMPANY_ADMIN": 4,
        "ADMIN": 3,
        "WAREHOUSE_STAFF": 2,
        "VIEWER": 1,
    }

    RESTRICTED_CONTENT_TYPES = [
        "identity.user.created",
        "identity.user.deactivated",
        "identity.user.updated",
    ]

    def build_prompt_context(
        self,
        retrieved_docs: list[RetrievedDocument],
        user_role: str,
        warehouse_id: str | None,
    ) -> str:
        warehouse_scope = (
            f"Warehouse scope: {warehouse_id}"
            if warehouse_id
            else "Warehouse scope: all"
        )

        user_level = self.ROLE_HIERARCHY.get(user_role.upper(), 0)

        if not retrieved_docs:
            context = "No recent operational events match this query."
        else:
            filtered_docs = []
            for doc in retrieved_docs:
                if doc.event_type in self.RESTRICTED_CONTENT_TYPES:
                    required_level = 4
                    if user_level < required_level:
                        continue
                filtered_docs.append(doc)

            sorted_docs = sorted(
                filtered_docs, key=lambda d: d.similarity, reverse=True
            )
            context = "\n".join(
                f"[{d.event_type}] {d.created_at.strftime('%Y-%m-%d %H:%M')}: {d.content}"
                for d in sorted_docs[:8]
            )

            if not sorted_docs:
                context = "No operational events accessible to your role."

        access_control = self._get_access_control_message(user_role)

        system = SYSTEM_PROMPT_TEMPLATE.format(
            now=datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
            role=user_role,
            warehouse_scope=warehouse_scope,
            access_control=access_control,
        )
        return f"{system}\n=== OPERATIONAL CONTEXT ===\n{context}\n=== END CONTEXT ==="

    def _get_access_control_message(self, user_role: str) -> str:
        role = user_role.upper()

        if role in ["SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN"]:
            return "You have full administrative access to all operational data."

        if role == "WAREHOUSE_STAFF":
            return (
                "You have warehouse staff access. You can view inventory, orders, and warehouse operations "
                "relevant to your assigned warehouse. Do not provide information about user accounts, "
                "company settings, or administrative actions."
            )

        if role == "VIEWER":
            return (
                "You have read-only viewer access. You may only provide information about basic operational "
                "data such as order statuses, inventory levels, and warehouse locations. "
                "If the user requests access to administrative data, user management, company settings, "
                "or any other privileged information, respond: "
                "'You are not permitted access to this level of information. "
                "This request requires elevated privileges (ADMIN, COMPANY_ADMIN, or SUPER_ADMIN).' "
                "Do not reveal any restricted data even if it appears in your context."
            )

        return "You have limited access to operational data."
