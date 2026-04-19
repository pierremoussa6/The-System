"use client";

import { useState } from "react";
import { useApp } from "../store";
import type { AiSystemAnalysis, UserProfile } from "../types";
import PanelCard from "../components/PanelCard";
import ActionButton from "../components/ActionButton";

type ProfileFormProps = {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onAnalysisReady: (analysis: AiSystemAnalysis | null) => void;
};

function ProfileForm({
  initialProfile,
  onSave,
  onAnalysisReady,
}: ProfileFormProps) {
  const [form, setForm] = useState<UserProfile>(initialProfile);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  function updateField<K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setSaved(false);
    setAnalysisError("");
  }

  async function handleSave() {
    const finalProfile: UserProfile = {
      ...form,
      onboardingCompleted: true,
    };

    onSave(finalProfile);
    setSaved(true);
    setAnalysisError("");
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/system/analyze-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: finalProfile,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze profile");
      }

      const data = (await response.json()) as {
        analysis: AiSystemAnalysis;
      };

      onAnalysisReady(data.analysis);
    } catch (error) {
      console.error(error);
      onAnalysisReady(null);
      setAnalysisError(
        "Profile saved, but AI analysis is not available right now. The System will continue using local logic."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PanelCard className="border-cyan-500">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((item) => (
            <button
              key={item}
              onClick={() => setStep(item)}
              className={`rounded px-4 py-2 text-sm transition ${
                step === item
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Step {item}
            </button>
          ))}
        </div>
      </PanelCard>

      {step === 1 && (
        <PanelCard>
          <h2 className="text-xl text-white">Identity</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-zinc-400">Name</label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Main Goal</label>
              <textarea
                className="min-h-25 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.goal}
                onChange={(e) => updateField("goal", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">
                Real-Life Profession or Role
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.profession}
                onChange={(e) => updateField("profession", e.target.value)}
                placeholder="Engineer, student, developer, nurse, founder..."
              />
              <p className="mt-1 text-xs text-zinc-500">
                This becomes your Main Job path.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Age Range</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.ageRange}
                onChange={(e) =>
                  updateField(
                    "ageRange",
                    e.target.value as UserProfile["ageRange"]
                  )
                }
              >
                <option value="Under 18">Under 18</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45+">45+</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Preferred Build</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.preferredBuild}
                onChange={(e) =>
                  updateField(
                    "preferredBuild",
                    e.target.value as UserProfile["preferredBuild"]
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
              <label className="mb-2 block text-zinc-400">Difficulty</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.difficulty}
                onChange={(e) =>
                  updateField(
                    "difficulty",
                    e.target.value as UserProfile["difficulty"]
                  )
                }
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">System Tone</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.systemTone}
                onChange={(e) =>
                  updateField(
                    "systemTone",
                    e.target.value as UserProfile["systemTone"]
                  )
                }
              >
                <option value="Strict">Strict</option>
                <option value="Balanced">Balanced</option>
                <option value="Intense">Intense</option>
              </select>
            </div>
          </div>
        </PanelCard>
      )}

      {step === 2 && (
        <PanelCard>
          <h2 className="text-xl text-white">Lifestyle and Capacity</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-zinc-400">Fitness Level</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.fitnessLevel}
                onChange={(e) =>
                  updateField(
                    "fitnessLevel",
                    e.target.value as UserProfile["fitnessLevel"]
                  )
                }
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Sleep Quality</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.sleepQuality}
                onChange={(e) =>
                  updateField(
                    "sleepQuality",
                    e.target.value as UserProfile["sleepQuality"]
                  )
                }
              >
                <option value="Poor">Poor</option>
                <option value="Average">Average</option>
                <option value="Good">Good</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Target Sleep Hours</label>
              <input
                type="number"
                min={4}
                max={10}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.sleepTargetHours}
                onChange={(e) =>
                  updateField("sleepTargetHours", Number(e.target.value))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Energy Pattern</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.energyPattern}
                onChange={(e) =>
                  updateField(
                    "energyPattern",
                    e.target.value as UserProfile["energyPattern"]
                  )
                }
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Unpredictable">Unpredictable</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Stress Level</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.stressLevel}
                onChange={(e) =>
                  updateField(
                    "stressLevel",
                    e.target.value as UserProfile["stressLevel"]
                  )
                }
              >
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">
                Available Minutes on Weekdays
              </label>
              <input
                type="number"
                min={5}
                max={240}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.availableMinutesWeekday}
                onChange={(e) =>
                  updateField("availableMinutesWeekday", Number(e.target.value))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">
                Available Minutes on Weekends
              </label>
              <input
                type="number"
                min={5}
                max={480}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.availableMinutesWeekend}
                onChange={(e) =>
                  updateField("availableMinutesWeekend", Number(e.target.value))
                }
              />
            </div>
          </div>
        </PanelCard>
      )}

      {step === 3 && (
        <PanelCard>
          <h2 className="text-xl text-white">Focus and Personalization</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-zinc-400">Main Improvement Area</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.mainImprovementArea}
                onChange={(e) =>
                  updateField(
                    "mainImprovementArea",
                    e.target.value as UserProfile["mainImprovementArea"]
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
              <label className="mb-2 block text-zinc-400">Study Interest</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.studyInterest}
                onChange={(e) =>
                  updateField(
                    "studyInterest",
                    e.target.value as UserProfile["studyInterest"]
                  )
                }
              >
                <option value="None">None</option>
                <option value="Programming">Programming</option>
                <option value="Engineering">Engineering</option>
                <option value="Reading">Reading</option>
                <option value="Chess">Chess</option>
                <option value="Language">Language</option>
                <option value="Business">Business</option>
                <option value="Design">Design</option>
                <option value="Fitness">Fitness</option>
                <option value="Creativity">Creativity</option>
                <option value="Strategy">Strategy</option>
                <option value="Craftsmanship">Craftsmanship</option>
                <option value="Music">Music</option>
                <option value="Research">Research</option>
                <option value="Problem Solving">Problem Solving</option>
                <option value="Technical Building">Technical Building</option>
                <option value="Adventure / Stealth">Adventure / Stealth</option>
                <option value="Discipline / Habits">Discipline / Habits</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">
                Hobbies and Side Interests
              </label>
              <textarea
                className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.hobbies}
                onChange={(e) => updateField("hobbies", e.target.value)}
                placeholder="Lock picking, guitar, hiking, drawing, coding, chess..."
              />
              <p className="mt-1 text-xs text-zinc-500">
                This guides your Secondary Job.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">
                Extra Study or Self-Development Interests
              </label>
              <textarea
                className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.customInterests}
                onChange={(e) => updateField("customInterests", e.target.value)}
                placeholder="Programming, languages, business, research, problem solving..."
              />
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Motivation Style</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.motivationStyle}
                onChange={(e) =>
                  updateField(
                    "motivationStyle",
                    e.target.value as UserProfile["motivationStyle"]
                  )
                }
              >
                <option value="Challenge">Challenge</option>
                <option value="Discipline">Discipline</option>
                <option value="Story">Story</option>
                <option value="Rewards">Rewards</option>
                <option value="Balance">Balance</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Penalty Style</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.penaltyStyle}
                onChange={(e) =>
                  updateField(
                    "penaltyStyle",
                    e.target.value as UserProfile["penaltyStyle"]
                  )
                }
              >
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="Strict">Strict</option>
              </select>
            </div>
          </div>
        </PanelCard>
      )}

      {step === 4 && (
        <PanelCard>
          <h2 className="text-xl text-white">Training and Support</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-zinc-400">Workout Preference</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.workoutPreference}
                onChange={(e) =>
                  updateField(
                    "workoutPreference",
                    e.target.value as UserProfile["workoutPreference"]
                  )
                }
              >
                <option value="Gym">Gym</option>
                <option value="Home">Home</option>
                <option value="Running">Running</option>
                <option value="Walking">Walking</option>
                <option value="Mobility">Mobility</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Diet Style</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.dietStyle}
                onChange={(e) =>
                  updateField(
                    "dietStyle",
                    e.target.value as UserProfile["dietStyle"]
                  )
                }
              >
                <option value="Balanced">Balanced</option>
                <option value="Flexible">Flexible</option>
                <option value="High-Protein">High-Protein</option>
                <option value="Weight-Loss">Weight-Loss</option>
                <option value="Muscle-Gain">Muscle-Gain</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">Dietary Restrictions</label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.dietaryRestrictions}
                onChange={(e) =>
                  updateField("dietaryRestrictions", e.target.value)
                }
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded border border-zinc-700 bg-zinc-800 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.wantsDietSupport}
                  onChange={(e) =>
                    updateField("wantsDietSupport", e.target.checked)
                  }
                />
                <span className="text-zinc-200">Diet support</span>
              </label>

              <label className="flex items-center gap-3 rounded border border-zinc-700 bg-zinc-800 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.wantsWorkoutPlan}
                  onChange={(e) =>
                    updateField("wantsWorkoutPlan", e.target.checked)
                  }
                />
                <span className="text-zinc-200">Workout planning</span>
              </label>

              <label className="flex items-center gap-3 rounded border border-zinc-700 bg-zinc-800 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.wantsStudyQuests}
                  onChange={(e) =>
                    updateField("wantsStudyQuests", e.target.checked)
                  }
                />
                <span className="text-zinc-200">Study quests</span>
              </label>

              <label className="flex items-center gap-3 rounded border border-zinc-700 bg-zinc-800 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.wantsLifestyleQuests}
                  onChange={(e) =>
                    updateField("wantsLifestyleQuests", e.target.checked)
                  }
                />
                <span className="text-zinc-200">Lifestyle quests</span>
              </label>
            </div>
          </div>
        </PanelCard>
      )}

      <PanelCard className="border-blue-500">
        <div className="flex flex-wrap gap-3">
          {step > 1 && (
            <ActionButton onClick={() => setStep((current) => current - 1)} variant="gray">
              Previous
            </ActionButton>
          )}

          {step < 4 && (
            <ActionButton onClick={() => setStep((current) => current + 1)} variant="blue">
              Next
            </ActionButton>
          )}

          <ActionButton onClick={handleSave} variant="purple">
            Save Survey
          </ActionButton>
        </div>

        {saved && (
          <p className="text-green-400">
            Survey saved. The System now has a stronger profile to personalize your experience.
          </p>
        )}

        {isAnalyzing && (
          <p className="text-cyan-400">
            The System is analyzing your hunter profile...
          </p>
        )}

        {analysisError && (
          <p className="text-yellow-400">{analysisError}</p>
        )}
      </PanelCard>
    </div>
  );
}

export default function ProfileSetupPage() {
  const { isLoaded, profile, updateProfile, updateAiAnalysis } = useApp();

  if (!isLoaded || !profile) {
    return (
      <div className="max-w-3xl space-y-6">
        <h1 className="mb-6 text-3xl text-blue-400">Profile Setup</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">System Initiation Survey</h1>
      <p className="text-zinc-400">
        Complete your hunter profile so The System can tailor quests, training pressure, diet direction, and progression style.
      </p>
      <ProfileForm
        initialProfile={profile}
        onSave={updateProfile}
        onAnalysisReady={updateAiAnalysis}
      />
    </div>
  );
}
