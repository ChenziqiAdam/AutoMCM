# AutoMCM

> Domain-specialized AI workspace for Mathematical Contest in Modeling (MCM/ICM)

![logo](assets/aotumcm.png)

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: 2026-01-30

## What is AutoMCM?

AutoMCM automates the MCM/ICM competition workflow from problem analysis to submission-ready papers. Unlike general AI tools, it embeds mathematical rigor, dimensional validation, and competition-specific requirements directly into the system.

**Key Capabilities**:
- **End-to-End Automation**: Problem → Research → Model → Experiments → 15-20 page LaTeX paper
- **Mathematical Rigor**: Dimensional validation, SymPy symbolic analysis, automated sensitivity testing
- **Competition Ready**: Generates publication-quality figures (300 DPI), comprehensive experiments, proper citations
- **Multi-LLM Support**: Flexible provider configuration (Anthropic, OpenAI, Google)
- **Desktop UI**: Real-time progress tracking with equation preview and validation status

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API key
cp .env.example .env
# Edit .env and add your LLM_API_KEY

# 3. Run desktop app (recommended)
npm run electron

# Or run CLI
npm start
```

## Project Structure

```
AutoMCM/
├── src/              # Core system (22 modules)
│   ├── agents/       # Researcher, Modeler, Writer agents
│   ├── core/         # Workflow engine, RAG, artifact store
│   ├── tools/        # Python executor, web search, SymPy
│   └── validators/   # Dimensional & paper validation
├── frontend/         # Electron desktop app
│   ├── js/app.js     # UI logic, real-time updates
│   └── index.html    # Three-panel interface
├── test/             # Integration & unit tests
├── examples/         # Workflow demos
└── workspaces/       # Generated projects (gitignored)
```

## Configuration

**Simple (Single Provider)**:
```bash
# .env
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-5
```

**Advanced (Multi-Provider)**:
```bash
# Use different models for each task
RESEARCHER_LLM_PROVIDER=anthropic
MODELER_LLM_PROVIDER=google
WRITER_LLM_PROVIDER=openai

# Respective API keys
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
```

## How It Works

**Three-Phase Workflow**:

1. **Planning Phase** (Researcher Agent)
   - Parse problem requirements and deliverables
   - Research similar problems via arXiv, historical MCM solutions
   - Create structured plan with approach, assumptions, and timeline

2. **Modeling Phase** (Modeler Agent)
   - Develop mathematical formulation with dimensional validation
   - Implement Python code with SymPy symbolic analysis
   - Run comprehensive experiments (baseline, sensitivity, scenarios, edge cases)
   - Generate 6+ publication-quality figures (time series, heatmaps, 3D surfaces)
   - Automated sensitivity analysis (±20% parameter variation)

3. **Writing Phase** (Writer Agent)
   - Generate 15-20 page LaTeX paper with all sections
   - Integrate all figures and experimental results
   - Compile to PDF with automatic error fixing
   - Validate completeness (figures, equations, references)

**Output**: `paper.pdf` ready for competition submission

## Architecture

**Master-Clone Pattern** (inspired by Claude Code):
- Single master agent coordinates workflow
- Spawns specialized clones for parallel tasks
- Shared context via `AUTOMCM.md` (single source of truth)
- Artifact store tracks all generated files with metadata

**Key Components**:
- **Agent Service**: Master orchestration loop
- **RAG System**: Neural embeddings for semantic search of historical solutions
- **Dimensional Validator**: SymPy-based equation checking
- **Paper Validator**: Automated quality checking (page count, figures, structure)
- **Artifact Store**: Tracks code, figures, LaTeX with versioning

## Usage Examples

**Desktop App** (Recommended):
```bash
npm run electron
```
- Real-time progress with phase indicators
- Equation preview with KaTeX rendering
- Validation status badges
- Live log streaming

**Build Standalone App**:
```bash
npm run build         # Creates dist/AutoMCM.app
```

## What Makes AutoMCM Different?

Unlike general AI coding assistants:

✅ **Mathematical Rigor**: Built-in dimensional analysis, symbolic validation
✅ **Domain Knowledge**: 100+ historical MCM solutions in RAG system
✅ **Competition Standards**: Auto-validates papers against MCM requirements
✅ **End-to-End**: From PDF problem to submission-ready LaTeX (not just code snippets)
✅ **Reproducible**: All experiments tracked in artifact store

**Estimated MCM Readiness**: 90-95% (human review still recommended)

## Requirements

- **Node.js**: ≥18.0.0
- **Python**: ≥3.8 (for SymPy, NumPy, Matplotlib)
- **LaTeX**: Optional (for PDF compilation)
- **LLM API**: Anthropic, OpenAI, or Google API key

## License

MIT

## Acknowledgments

Built for MCM/ICM participants. Inspired by the Claude Code architecture and mathematical modeling best practices.
