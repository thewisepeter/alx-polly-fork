"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/app/lib/actions/auth-actions";
import DOMPurify from 'dompurify';

const MAX_QUESTION_LENGTH = 255;
const MAX_OPTION_LENGTH = 100;
const MAX_OPTIONS_COUNT = 10;

// CREATE POLL
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  let question = formData.get("question") as string;
  let options = formData.getAll("options").filter(Boolean) as string[];

  // Sanitize and validate input
  question = DOMPurify.sanitize(question);
  options = options.map(option => DOMPurify.sanitize(option));

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return { error: `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.` };
  }

  if (options.length > MAX_OPTIONS_COUNT) {
    return { error: `A poll cannot have more than ${MAX_OPTIONS_COUNT} options.` };
  }

  for (const option of options) {
    if (option.length > MAX_OPTION_LENGTH) {
      return { error: `One or more options exceed maximum length of ${MAX_OPTION_LENGTH} characters.` };
    }
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question,
      options,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

// ADMIN GET ALL POLLS
export async function getAdminPolls() {
  const supabase = await createClient();
  const user = await getCurrentUser(); // Get user with metadata

  if (!user || !(user.user_metadata as { is_admin?: boolean }).is_admin) {
    return { polls: [], error: "Unauthorized access." };
  }

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser(); // Get user with metadata

  let query = supabase.from("polls").select("*").eq("id", id).single();

  if (user) {
    const isAdmin = (user.user_metadata as { is_admin?: boolean }).is_admin === true;
    // If not an admin, restrict access to their own polls
    if (!isAdmin) {
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    } else {
      // Admins can see all polls, no further restriction needed
    }
  } else {
    // If no user is logged in, only allow access to public polls
    query = query.eq("is_public", true); // Assuming polls have an is_public column
  }

  const { data, error } = await query;

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Design decision: Allow unauthenticated users to vote.
  // If anonymous voting is not desired, uncomment the following line:
  // if (!user) return { error: 'You must be logged in to vote.' };
  // Note: For public polls allowing unauthenticated voting, consider implementing
  // IP-based rate limiting or other anti-spam measures to prevent abuse.

  // Prevent authenticated users from voting multiple times on the same poll
  if (user) {
    const { data: existingVote, error: voteError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .single();

    if (voteError && voteError.code !== 'PGRST116') { // PGRST116 means no rows found
        return { error: voteError.message };
    }

    if (existingVote) {
      return { error: "You have already voted on this poll." };
    }
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}

// DELETE POLL
export async function deletePoll(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // Check if the user is an admin
  const isAdmin = (user.user_metadata as { is_admin?: boolean }).is_admin === true;

  let query = supabase.from("polls").delete().eq("id", id);

  // If not an admin, restrict deletion to their own polls
  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { error } = await query;

  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  let question = formData.get("question") as string;
  let options = formData.getAll("options").filter(Boolean) as string[];

  // Sanitize and validate input
  question = DOMPurify.sanitize(question);
  options = options.map(option => DOMPurify.sanitize(option));

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return { error: `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.` };
  }

  if (options.length > MAX_OPTIONS_COUNT) {
    return { error: `A poll cannot have more than ${MAX_OPTIONS_COUNT} options.` };
  }

  for (const option of options) {
    if (option.length > MAX_OPTION_LENGTH) {
      return { error: `One or more options exceed maximum length of ${MAX_OPTION_LENGTH} characters.` };
    }
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question, options })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
