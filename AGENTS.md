<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Agent Working Instructions

Welcome to the RoyalBet codebase! Please adhere to the following directives when developing features, fixing bugs, or refactoring:

- **Read Memory First**: Review [.ai-memory/MEMORY.md](file:///Users/stzkdigitalmedia/Desktop/royal07/.ai-memory/MEMORY.md) before making any code changes.
- **Consult Subsystems**: Refer to specific detailed memory maps inside the `/.ai-memory/` directory (e.g., `DATABASE_MAP.md`, `ARCHITECTURE.md`, `BUSINESS_LOGIC.md`) before changing corresponding domains.
- **Preserve Architecture**: Follow existing patterns (Modular NestJS 10, Next.js 15 routing structures, database version-locks for wallets).
- **Search First**: Look for existing helper logic and classes (e.g., calculations, DB wrappers, adapters) before writing new implementations.
- **Change Safety**: Verify all downstream dependencies before changing shared services, entities, or DTO properties.
- **Maintain Quality**: Do not rewrite working code unnecessarily. Keep styling responsive, premium, and clean.
- **Secret Safety**: Never commit, store, or log configuration secrets, private keys, or API tokens.
- **Update Memory**: Whenever you modify APIs, schemas, infrastructure components, or major domain workflows, update the corresponding file in `/.ai-memory/`.
