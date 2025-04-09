import React, { useState, useEffect } from "react";
import FcmTester from "./components/FcmTester";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      return stored === "true";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Update document class and localStorage when darkMode changes
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Firebase Cloud Messaging Tester
          </h1>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/gobansource/fcmtester"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
            >
              <img
                src="github-mark.svg"
                alt="GitHub"
                className="w-6 h-6 dark:invert"
              />
            </a>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
        <FcmTester />
      </main>
      <footer className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
        <p>
          Open source project by{" "}
          <a
            href="https://gobansource.com"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Goban Source
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
