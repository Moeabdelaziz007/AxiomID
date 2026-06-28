"""CrewAI example that gates a task with AxiomID trust context."""

from crewai import Agent, Crew, Process, Task

from crewai_axiomid_tools import axiomid_enforce_soul_gate


identity_gatekeeper = Agent(
    role="AxiomID Identity Gatekeeper",
    goal="Verify that a DID has enough trust to run the assigned task.",
    backstory="You enforce AxiomID Soul Gate rules before other agents proceed.",
    tools=[axiomid_enforce_soul_gate],
    verbose=True,
)

gate_task = Task(
    description=(
        "Check whether did:axiom:operator can perform the research workflow. "
        "Use a minimum trust score of 70 and return the tool result."
    ),
    expected_output="A JSON gate result with allowed, reason, and trust context fields.",
    agent=identity_gatekeeper,
)

crew = Crew(
    agents=[identity_gatekeeper],
    tasks=[gate_task],
    process=Process.sequential,
)


if __name__ == "__main__":
    print(crew.kickoff())
