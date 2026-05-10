"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import type { AiSystemAnalysis, UserProfile } from "../types";
import { defaultProfile } from "../quest-engine";
import { getIncompleteProfileReasons, isProfileComplete } from "../profile";
import PanelCard from "../components/PanelCard";
import ActionButton from "../components/ActionButton";

type ProfileFormProps = {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onAnalysisReady: (analysis: AiSystemAnalysis | null) => void;
  isInitiation: boolean;
};

function FieldLabel({
  children,
  help,
}: {
  children: ReactNode;
  help?: string;
}) {
  return (
    <span className="mb-2 flex items-center gap-2 text-zinc-400">
      <span>{children}</span>
      {help && (
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label={`Help: ${children}`}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-xs text-zinc-300 hover:border-blue-400 hover:text-blue-200"
          >
            ?
          </button>
          <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs leading-5 text-zinc-200 shadow-xl group-hover:block group-focus-within:block">
            {help}
          </span>
        </span>
      )}
    </span>
  );
}

function clampNumber(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function NumericProfileInput({
  value,
  onChange,
  fallback,
  min,
  max,
  step = 1,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  fallback: number;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
      value={Number.isFinite(value) ? String(value) : ""}
      onChange={(event) => {
        const nextValue = event.target.value;
        onChange(nextValue === "" ? Number.NaN : Number(nextValue));
      }}
      onBlur={() => onChange(clampNumber(value, fallback, min, max))}
      placeholder={placeholder}
    />
  );
}

function sanitizeProfileForSave(profile: UserProfile): UserProfile {
  return {
    ...profile,
    goal: profile.motivationWhy.trim() || profile.goal.trim(),
    age: Math.round(clampNumber(profile.age, defaultProfile.age, 13, 100)),
    weightKg:
      Math.round(clampNumber(profile.weightKg, defaultProfile.weightKg, 30, 300) * 10) /
      10,
    heightCm: Math.round(
      clampNumber(profile.heightCm, defaultProfile.heightCm, 120, 230)
    ),
    sleepTargetHours:
      Math.round(
        clampNumber(
          profile.sleepTargetHours,
          defaultProfile.sleepTargetHours,
          4,
          12
        ) * 10
      ) / 10,
    availableMinutesWeekday: Math.round(
      clampNumber(
        profile.availableMinutesWeekday,
        defaultProfile.availableMinutesWeekday,
        5,
        240
      )
    ),
    availableMinutesWeekend: Math.round(
      clampNumber(
        profile.availableMinutesWeekend,
        defaultProfile.availableMinutesWeekend,
        5,
        480
      )
    ),
    customSpecialQuestIntervalDays: Math.round(
      clampNumber(
        profile.customSpecialQuestIntervalDays,
        defaultProfile.customSpecialQuestIntervalDays,
        2,
        30
      )
    ),
    onboardingCompleted: true,
  };
}

function ProfileForm({
  initialProfile,
  onSave,
  onAnalysisReady,
  isInitiation,
}: ProfileFormProps) {
  const [form, setForm] = useState<UserProfile>(initialProfile);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const element = formTopRef.current;
    if (!element) return;

    const top =
      element.getBoundingClientRect().top + window.scrollY - 84;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
  }, [step]);

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
    const finalProfile = sanitizeProfileForSave(form);

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
      <div ref={formTopRef} />

      <PanelCard className="border-cyan-500">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((item) => (
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
              <FieldLabel help="The name shown across your profile, quests, logs, and admin view.">
                Name
              </FieldLabel>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>

            <div>
              <FieldLabel help="This is the anchor the AI and quest engine use when choosing tone, pressure, and reminders.">
                Why do you want to be better?
              </FieldLabel>
              <textarea
                className="min-h-25 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.motivationWhy}
                onChange={(e) => updateField("motivationWhy", e.target.value)}
                placeholder="I want to become stronger, more disciplined, healthier, more reliable..."
              />
              <p className="mt-1 text-xs text-zinc-500">
                The System uses this as your motivation anchor when assigning pressure and workout structure.
              </p>
            </div>

            <div>
              <FieldLabel help="Used as your Main Job path so quests can support your real responsibilities.">
                Real-Life Profession or Role
              </FieldLabel>
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
              <FieldLabel help="A broad range for tone and safety checks. Exact age below improves nutrition targets.">
                Age Range
              </FieldLabel>
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
              <FieldLabel help="Your preferred RPG growth style. It influences quest rewards and special quest selection.">
                Preferred Build
              </FieldLabel>
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
              <FieldLabel help="Controls XP scaling, penalty pressure, and how intense the System sounds.">
                Difficulty
              </FieldLabel>
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
              <FieldLabel help="Controls whether guidance feels strict, balanced, or intense.">
                System Tone
              </FieldLabel>
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
              <FieldLabel help="Used to scale workout suggestions and avoid assigning advanced fitness quests too early.">
                Fitness Level
              </FieldLabel>
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

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel help="Exact age is used for nutrition targets. You can clear the field while typing; fallback applies on blur or save.">
                  Age
                </FieldLabel>
                <NumericProfileInput
                  value={form.age}
                  onChange={(value) => updateField("age", value)}
                  fallback={defaultProfile.age}
                  min={13}
                  max={100}
                  placeholder="30"
                />
              </div>

              <div>
                <FieldLabel help="Used for protein and calorie target estimates.">
                  Weight (kg)
                </FieldLabel>
                <NumericProfileInput
                  value={form.weightKg}
                  onChange={(value) => updateField("weightKg", value)}
                  fallback={defaultProfile.weightKg}
                  min={30}
                  max={300}
                  step={0.1}
                  placeholder="75"
                />
              </div>

              <div>
                <FieldLabel help="Used with age and weight to estimate daily nutrition targets.">
                  Height (cm)
                </FieldLabel>
                <NumericProfileInput
                  value={form.heightCm}
                  onChange={(value) => updateField("heightCm", value)}
                  fallback={defaultProfile.heightCm}
                  min={120}
                  max={230}
                  placeholder="175"
                />
              </div>
            </div>

            <div>
              <FieldLabel help="Used to decide when recovery quests should be prioritized over harder pressure.">
                Sleep Quality
              </FieldLabel>
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
              <FieldLabel help="Your target sleep window. The field can be cleared while typing; validation happens on blur or save.">
                Target Sleep Hours
              </FieldLabel>
              <NumericProfileInput
                value={form.sleepTargetHours}
                onChange={(value) => updateField("sleepTargetHours", value)}
                fallback={defaultProfile.sleepTargetHours}
                min={4}
                max={12}
                step={0.5}
              />
            </div>

            <div>
              <FieldLabel help="Helps weekly plans place harder work when you are more likely to have energy.">
                Energy Pattern
              </FieldLabel>
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
              <FieldLabel help="Used to soften or intensify quest pressure and penalties.">
                Stress Level
              </FieldLabel>
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
              <FieldLabel help="Used to estimate calorie targets and how much training pressure is realistic.">
                Activity Level
              </FieldLabel>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.activityLevel}
                onChange={(e) =>
                  updateField(
                    "activityLevel",
                    e.target.value as UserProfile["activityLevel"]
                  )
                }
              >
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Very High">Very High</option>
              </select>
            </div>

            <div>
              <FieldLabel help="Your normal weekday time budget. Quests and workouts should fit this number.">
                Available Minutes on Weekdays
              </FieldLabel>
              <NumericProfileInput
                value={form.availableMinutesWeekday}
                onChange={(value) =>
                  updateField("availableMinutesWeekday", value)
                }
                fallback={defaultProfile.availableMinutesWeekday}
                min={5}
                max={240}
              />
            </div>

            <div>
              <FieldLabel help="Your weekend time budget for longer workouts, chores, study, or recovery.">
                Available Minutes on Weekends
              </FieldLabel>
              <NumericProfileInput
                value={form.availableMinutesWeekend}
                onChange={(value) =>
                  updateField("availableMinutesWeekend", value)
                }
                fallback={defaultProfile.availableMinutesWeekend}
                min={5}
                max={480}
              />
            </div>
          </div>
        </PanelCard>
      )}

      {step === 3 && (
        <PanelCard>
          <h2 className="text-xl text-white">Intelligence and Personalization</h2>

          <div className="space-y-4">
            <div>
              <FieldLabel help="This tells daily and special quests which life axis should get extra pressure.">
                Main Improvement Area
              </FieldLabel>
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
                <option value="Intelligence">Intelligence</option>
                <option value="Lifestyle">Lifestyle</option>
              </select>
            </div>

            <div>
              <FieldLabel help="Used for study quests and your inferred Secondary Job themes.">
                Study Interest
              </FieldLabel>
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
              <FieldLabel help="These feed the Secondary Job path and hobby-based special quests.">
                Hobbies and Side Interests
              </FieldLabel>
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
              <FieldLabel help="Used when the System creates self-improvement and learning quests.">
                Extra Study or Self-Development Interests
              </FieldLabel>
              <textarea
                className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.customInterests}
                onChange={(e) => updateField("customInterests", e.target.value)}
                placeholder="Programming, languages, business, research, problem solving..."
              />
            </div>

            <div>
              <FieldLabel help="Controls whether rewards, challenge, story, discipline, or balance shape the wording.">
                Motivation Style
              </FieldLabel>
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
              <FieldLabel help="Controls corrective action intensity when a special quest is missed.">
                Penalty Style
              </FieldLabel>
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
              <FieldLabel help="This is the main training style used by the workout plan and workout-day quests.">
                Workout Preference
              </FieldLabel>
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
              <FieldLabel help="Used for nutrition targets, diet quests, and AI diet feedback.">
                Diet Style
              </FieldLabel>
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
              <FieldLabel help="All diet recommendations should avoid or account for these restrictions.">
                Dietary Restrictions
              </FieldLabel>
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

      {step === 5 && (
        <PanelCard className="border-purple-500">
          <h2 className="text-xl text-white">RPG Identity Editor</h2>
          <p className="text-sm text-zinc-400">
            Override the AI jobs when you want the character identity to be more exact.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-zinc-400">
                Main Job Override
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.mainJobOverride}
                onChange={(e) => updateField("mainJobOverride", e.target.value)}
                placeholder="Engineer, Developer, Student, Coach..."
              />
              <p className="mt-1 text-xs text-zinc-500">
                Leave empty to let AI infer it from your profession.
              </p>
            </div>

            <div>
              <FieldLabel help="These are treated as the source of truth for workout days. Workout quests should not appear on other days.">
                Preferred Days for Workout
              </FieldLabel>
              <textarea
                className="min-h-20 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.preferredWorkoutDays}
                onChange={(e) =>
                  updateField("preferredWorkoutDays", e.target.value)
                }
                placeholder="Example: Monday, Wednesday, Friday"
              />
              <p className="mt-1 text-xs text-zinc-500">
                List the days you realistically want your main training sessions.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-zinc-400">
                Secondary Job Override
              </label>
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.secondaryJobOverride}
                onChange={(e) =>
                  updateField("secondaryJobOverride", e.target.value)
                }
                placeholder="Thief, Hacker, Warrior, Bard, Scholar..."
              />
              <p className="mt-1 text-xs text-zinc-500">
                This is your playful hobby identity.
              </p>
            </div>

            <div>
              <FieldLabel help="This controls the type mix when special quests are generated.">
                Special Quest Rotation
              </FieldLabel>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.questRotationPreference}
                onChange={(e) =>
                  updateField(
                    "questRotationPreference",
                    e.target.value as UserProfile["questRotationPreference"]
                  )
                }
              >
                <option value="Balanced">Balanced</option>
                <option value="Main Job">Main Job priority</option>
                <option value="Secondary Job">Secondary Job priority</option>
                <option value="Fitness">Fitness priority</option>
                <option value="Diet">Diet priority</option>
                <option value="Hybrid">Hybrid priority</option>
              </select>
            </div>

            <div>
              <FieldLabel help="Controls how often special quests appear. They only appear daily when you choose Every day.">
                Special Quest Frequency
              </FieldLabel>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.specialQuestFrequency}
                onChange={(e) =>
                  updateField(
                    "specialQuestFrequency",
                    e.target.value as UserProfile["specialQuestFrequency"]
                  )
                }
              >
                <option value="every_day">Every day</option>
                <option value="every_3_days">Every 3 days</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom frequency</option>
              </select>
            </div>

            {form.specialQuestFrequency === "custom" && (
              <div>
                <FieldLabel help="Enter the number of days between special quests. The System accepts 2 to 30 days.">
                  Custom Frequency (days)
                </FieldLabel>
                <NumericProfileInput
                  value={form.customSpecialQuestIntervalDays}
                  onChange={(value) =>
                    updateField("customSpecialQuestIntervalDays", value)
                  }
                  fallback={defaultProfile.customSpecialQuestIntervalDays}
                  min={2}
                  max={30}
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-zinc-400">
                Identity Notes
              </label>
              <textarea
                className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                value={form.rpgIdentityNotes}
                onChange={(e) => updateField("rpgIdentityNotes", e.target.value)}
                placeholder="Example: I want my secondary identity to feel stealthy, technical, and disciplined."
              />
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

          {step < 5 && (
            <ActionButton onClick={() => setStep((current) => current + 1)} variant="blue">
              Next
            </ActionButton>
          )}

          <ActionButton onClick={handleSave} variant="purple">
            {isInitiation ? "Complete Initiation" : "Save Preferences"}
          </ActionButton>
        </div>

        {saved && (
          <p className="text-green-400">
            {isInitiation
              ? "Initiation saved. The System now has a stronger profile to personalize your experience."
              : "Preferences saved. Quests, workout guidance, and nutrition targets have been recalibrated."}
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

  const incompleteReasons = getIncompleteProfileReasons(profile);
  const initiationRequired = !isProfileComplete(profile);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">
        {initiationRequired ? "System Initiation Survey" : "Profile Preferences"}
      </h1>
      <p className="text-zinc-400">
        {initiationRequired
          ? "Complete your hunter profile so The System can tailor quests, training pressure, diet direction, and progression style."
          : "Your profile is complete. Update preferences here when your schedule, goals, or nutrition targets change."}
      </p>
      {initiationRequired && (
        <PanelCard className="border-yellow-500">
          <p className="font-medium text-yellow-200">
            Initiation is required before the full app unlocks.
          </p>
          <div className="space-y-1 text-sm text-zinc-300">
            {incompleteReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </PanelCard>
      )}
      <ProfileForm
        initialProfile={profile}
        onSave={updateProfile}
        onAnalysisReady={updateAiAnalysis}
        isInitiation={initiationRequired}
      />
    </div>
  );
}

