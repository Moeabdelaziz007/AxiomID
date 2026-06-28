"""CrewAI example that drafts an AxiomID attestation from task output."""

from crewai import Agent, Crew, Process, Task

from crewai_axiomid_tools import axiomid_create_attestation_draft


attestation_writer = Agent(
    role="AxiomID Attestation Writer",
    goal="Draft unsigned AxiomID attestations for completed CrewAI work.",
    backstory="You convert verified task results into structured AxiomID drafts.",
    tools=[axiomid_create_attestation_draft],
    verbose=True,
)

attestation_task = Task(
    description=(
        "Create an attestation draft with issuer DID did:axiom:crewai-reviewer, "
        "subject DID did:axiom:contributor, and claim 'CrewAI task completed'."
    ),
    expected_output=(
        "A serialized JSON string containing an unsigned "
        "AxiomIDAttestationDraft object."
    ),
    agent=attestation_writer,
)

crew = Crew(
    agents=[attestation_writer],
    tasks=[attestation_task],
    process=Process.sequential,
)


if __name__ == "__main__":
    print(crew.kickoff())
