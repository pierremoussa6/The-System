"use client";

import { useState } from "react";
import { useApp } from "../store";
import PanelCard from "../components/PanelCard";
import ActionButton from "../components/ActionButton";
import type { UserProfile } from "../types";

type OnboardingFormProps = {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
};

function OnboardingForm({ initialProfile, onSave }: OnboardingFormProps) {
  const [name, setName] = useState(initialProfile.name);
  const [goal, setGoal] = useState(initialProfile.goal);
  const [preferredBuild, setPreferredBuild] = useState(
    initialProfile.preferredBuild
  );
  const [difficulty, setDifficulty] = useState(initialProfile.difficulty);
  const [fitnessLevel, setFitnessLevel] = useState(initialProfile.fitnessLevel);
  const [sleepQuality, setSleepQuality] = useState(initialProfile.sleepQuality);
  const [mainImprovementArea, setMainImprovementArea] = useState(
    initialProfile.mainImprovementArea
  );
  const [studyInterest, setStudyInterest] = useState(
    initialProfile.studyInterest
  );
  const [penaltyStyle, setPenaltyStyle] = useState(
    initialProfile.penaltyStyle
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave({
      ...initialProfile,
      name,
      goal,
      preferredBuild,
      difficulty,
      fitnessLevel,
      sleepQuality,
      mainImprovementArea,
      studyInterest,
      penaltyStyle,
      onboardingCompleted: true,
    });
    setSaved(true);
  }

  return (
    <PanelCard>
      <div className="space-y-4">
        <div>
          <label className="block text-zinc-400 mb-2">Name</label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Main Goal</label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Preferred Build</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={preferredBuild}
            onChange={(e) =>
              setPreferredBuild(
                e.target.value as
                  | "Balanced"
                  | "Warrior"
                  | "Endurance"
                  | "Monk"
                  | "Scholar"
              )
            }
          >
            <option value="Balanced">Balanced</option>
            <option value="Warrior">Warrior</option>
            <option value="Endurance">Endurance</option>
            <option value="Monk">Monk</option>
            <option value="Scholar">Scholar</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Difficulty</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")
            }
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Fitness Level</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={fitnessLevel}
            onChange={(e) =>
              setFitnessLevel(
                e.target.value as "Beginner" | "Intermediate" | "Advanced"
              )
            }
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Sleep Quality</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={sleepQuality}
            onChange={(e) =>
              setSleepQuality(e.target.value as "Poor" | "Average" | "Good")
            }
          >
            <option value="Poor">Poor</option>
            <option value="Average">Average</option>
            <option value="Good">Good</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Main Improvement Area</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={mainImprovementArea}
            onChange={(e) =>
              setMainImprovementArea(
                e.target.value as
                  | "Fitness"
                  | "Discipline"
                  | "Focus"
                  | "Lifestyle"
                  | "Balanced"
              )
            }
          >
            <option value="Balanced">Balanced</option>
            <option value="Fitness">Fitness</option>
            <option value="Discipline">Discipline</option>
            <option value="Focus">Focus</option>
            <option value="Lifestyle">Lifestyle</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Study Interest</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={studyInterest}
            onChange={(e) =>
              setStudyInterest(
                e.target.value as
                  | "Programming"
                  | "Reading"
                  | "Chess"
                  | "Language"
                  | "None"
              )
            }
          >
            <option value="None">None</option>
            <option value="Programming">Programming</option>
            <option value="Reading">Reading</option>
            <option value="Chess">Chess</option>
            <option value="Language">Language</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Penalty Style</label>
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            value={penaltyStyle}
            onChange={(e) =>
              setPenaltyStyle(e.target.value as "Light" | "Moderate" | "Strict")
            }
          >
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Strict">Strict</option>
          </select>
        </div>

        <ActionButton onClick={handleSave} variant="blue">
          Save Onboarding
        </ActionButton>

        {saved && <p className="text-green-400">Onboarding saved.</p>}
      </div>
    </PanelCard>
  );
}

export default function OnboardingPage() {
  const { isLoaded, profile, updateProfile } = useApp();

  if (!isLoaded || !profile) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl text-blue-400 mb-6">Onboarding</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl text-blue-400 mb-6">Onboarding</h1>
      <OnboardingForm initialProfile={profile} onSave={updateProfile} />
    </div>
  );
}
