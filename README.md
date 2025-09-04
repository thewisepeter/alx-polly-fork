# ALX Polly: A Polling Application

Welcome to ALX Polly, a full-stack polling application built with Next.js, TypeScript, and Supabase. This project serves as a practical learning ground for modern web development concepts, with a special focus on identifying and fixing common security vulnerabilities.

## About the Application

ALX Polly allows authenticated users to create, share, and vote on polls. It's a simple yet powerful application that demonstrates key features of modern web development:

-   **Authentication**: Secure user sign-up and login.
-   **Poll Management**: Users can create, view, and delete their own polls.
-   **Voting System**: A straightforward system for casting and viewing votes.
-   **User Dashboard**: A personalized space for users to manage their polls.

The application is built with a modern tech stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database**: [Supabase](https://supabase.io/)
-   **UI**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: React Server Components and Client Components

---

## 🚀 The Challenge: Security Audit & Remediation

As a developer, writing functional code is only half the battle. Ensuring that the code is secure, robust, and free of vulnerabilities is just as critical. This version of ALX Polly has been intentionally built with several security flaws, providing a real-world scenario for you to practice your security auditing skills.

**Your mission is to act as a security engineer tasked with auditing this codebase.**

### Your Objectives:

1.  **Identify Vulnerabilities**:
    -   Thoroughly review the codebase to find security weaknesses.
    -   Pay close attention to user authentication, data access, and business logic.
    -   Think about how a malicious actor could misuse the application's features.

2.  **Understand the Impact**:
    -   For each vulnerability you find, determine the potential impact.Query your AI assistant about it. What data could be exposed? What unauthorized actions could be performed?

3.  **Propose and Implement Fixes**:
    -   Once a vulnerability is identified, ask your AI assistant to fix it.
    -   Write secure, efficient, and clean code to patch the security holes.
    -   Ensure that your fixes do not break existing functionality for legitimate users.

### Where to Start?

A good security audit involves both static code analysis and dynamic testing. Here’s a suggested approach:

1.  **Familiarize Yourself with the Code**:
    -   Start with `app/lib/actions/` to understand how the application interacts with the database.
    -   Explore the page routes in the `app/(dashboard)/` directory. How is data displayed and managed?
    -   Look for hidden or undocumented features. Are there any pages not linked in the main UI?

2.  **Use Your AI Assistant**:
    -   This is an open-book test. You are encouraged to use AI tools to help you.
    -   Ask your AI assistant to review snippets of code for security issues.
    -   Describe a feature's behavior to your AI and ask it to identify potential attack vectors.
    -   When you find a vulnerability, ask your AI for the best way to patch it.

---

## Getting Started

To begin your security audit, you'll need to get the application running on your local machine.

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v20.x or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Supabase](https://supabase.io/) account (the project is pre-configured, but you may need your own for a clean slate).

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd alx-polly
npm install
```

### 3. Environment Variables

The project uses Supabase for its backend. An environment file `.env.local` is needed.Use the keys you created during the Supabase setup process.

### 4. Running the Development Server

Start the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

Good luck, engineer! This is your chance to step into the shoes of a security professional and make a real impact on the quality and safety of this application. Happy hunting!

## 🐛 Identified and Remediated Security Vulnerabilities

During a comprehensive security audit of ALX Polly, several vulnerabilities were identified and subsequently remediated. This section details these issues, their potential impact, and the steps taken to secure the application.

### 1. User Authentication and Authorization Vulnerabilities

#### A. Exposure of Sensitive Error Messages

*   **Impact:** This vulnerability could assist attackers in user enumeration, allowing them to distinguish between "email not found" and "incorrect password" errors. This information could then be used for targeted phishing or brute-force attacks on known accounts.
*   **Remediation:** Error messages returned from authentication actions (`login`, `register`) in `app/lib/actions/auth-actions.ts` were made more generic (e.g., "Invalid credentials", "Registration failed") to prevent user enumeration.

#### B. Lack of Robust Server-Side Input Validation

*   **Impact:** Without strong server-side validation, users could create weak passwords, making accounts susceptible to brute-force attacks. Malicious or malformed input in email fields could also lead to injection attacks or data integrity issues.
*   **Remediation:** Comprehensive server-side validation was implemented in `app/lib/actions/auth-actions.ts` for email format and password strength (minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character).

#### C. Privilege Escalation due to Missing Role-Based Access Control (RBAC)

*   **Impact:** Any authenticated user could access the `/admin` page, view all polls, and delete any poll in the system, leading to unauthorized data access and manipulation.
*   **Remediation:**
    *   An `is_admin: false` flag was added to new users' `user_metadata` during registration in `app/lib/actions/auth-actions.ts`.
    *   A new Server Action `getAdminPolls` was created in `app/lib/actions/poll-actions.ts` to restrict poll retrieval to administrators only.
    *   The `app/(dashboard)/admin/page.tsx` was updated to use `getAdminPolls`, enforcing server-side access control for the admin panel.
    *   The `deletePoll` Server Action in `app/lib/actions/poll-actions.ts` was modified to allow deletion only by the poll owner or an administrator.

#### D. Inconsistent Client-Side Input Validation

*   **Impact:** Lack of immediate client-side feedback for invalid inputs resulted in a poor user experience and increased unnecessary server load.
*   **Remediation:** Client-side email and password validation mirroring the server-side rules was added to both `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`, providing instant user feedback.

### 2. Data Access Vulnerabilities

#### A. Unrestricted Access to Individual Polls via `getPollById`

*   **Impact:** Any user, authenticated or not, could view the full details of any poll by simply knowing its ID, potentially leading to unauthorized data exposure.
*   **Remediation:** The `getPollById` function in `app/lib/actions/poll-actions.ts` was updated to restrict access. Polls can now only be viewed by the poll's owner, an administrator, or any user (even unauthenticated) if the poll is explicitly marked as `is_public`.

#### B. Unauthenticated Voting via `submitVote`

*   **Impact:** While anonymous voting was a design choice, it could potentially lead to vote manipulation or spamming if not properly managed.
*   **Remediation:** A clear comment was added to the `submitVote` function in `app/lib/actions/poll-actions.ts` to document this design decision and highlight the potential need for anti-spam measures like IP-based rate limiting.

### 3. Business Logic Vulnerabilities

#### A. Poll Creation and Update (XSS & Input Limits)

*   **Impact:** The `question` and `options` fields were vulnerable to Cross-Site Scripting (XSS) attacks due to a lack of sanitization. Additionally, the absence of input length limits could lead to database integrity issues or denial-of-service by storing excessively long data.
*   **Remediation:**
    *   The `dompurify` library was installed and used to sanitize all user-provided input for `question` and `options` in both `createPoll` and `updatePoll` Server Actions (in `app/lib/actions/poll-actions.ts`).
    *   Server-side input limits were implemented in `app/lib/actions/poll-actions.ts`: maximum length for `question` (255 characters), maximum length for each `option` (100 characters), and a maximum of 10 options per poll.

#### B. Multiple Voting by Authenticated Users

*   **Impact:** Authenticated users could vote multiple times on the same poll, potentially skewing poll results and undermining data integrity.
*   **Remediation:** A server-side check was added to the `submitVote` function (in `app/lib/actions/poll-actions.ts`) to prevent authenticated users from casting more than one vote per poll.

#### C. Tabnabbing in Social Sharing

*   **Impact:** The social sharing links in `app/(dashboard)/polls/vulnerable-share.tsx` were susceptible to a "tabnabbing" attack, where a malicious page opened in a new tab could hijack the original page.
*   **Remediation:** The `window.open` calls for Twitter and Facebook sharing in `app/(dashboard)/polls/vulnerable-share.tsx` were updated to include `"noopener,noreferrer"` as the third argument, mitigating the tabnabbing vulnerability.
