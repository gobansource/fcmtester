import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

interface DeviceToken {
  label: string;
  token: string;
}

interface ResponseEntry {
  timestamp: Date;
  content: string;
  isNew: boolean;
}

const FcmTester: React.FC = () => {
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number>(-1);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenValue, setNewTokenValue] = useState("");
  const [message, setMessage] = useState("");
  const [data, setData] = useState("");
  const [responseHistory, setResponseHistory] = useState<ResponseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  const [bundleId, setBundleId] = useState<string>("com.app");

  useEffect(() => {
    const storedTokens = localStorage.getItem("deviceTokens");
    if (storedTokens) {
      setDeviceTokens(JSON.parse(storedTokens));
    }
  }, []);

  useEffect(() => {
    if (responseHistory.length > 0 && responseHistory[0].isNew) {
      setTimeout(() => {
        setResponseHistory((prev) => [
          { ...prev[0], isNew: false },
          ...prev.slice(1),
        ]);
      }, 300);
    }
  }, [responseHistory]);

  const saveTokensToLocalStorage = (tokens: DeviceToken[]) => {
    localStorage.setItem("deviceTokens", JSON.stringify(tokens));
  };

  const handleAddToken = () => {
    if (newTokenLabel && newTokenValue) {
      const updatedTokens = [
        ...deviceTokens,
        { label: newTokenLabel, token: newTokenValue },
      ];
      setDeviceTokens(updatedTokens);
      saveTokensToLocalStorage(updatedTokens);
      setNewTokenLabel("");
      setNewTokenValue("");
    }
  };

  const handleRemoveToken = (index: number) => {
    const updatedTokens = deviceTokens.filter((_, i) => i !== index);
    setDeviceTokens(updatedTokens);
    saveTokensToLocalStorage(updatedTokens);
    if (selectedTokenIndex === index) {
      setSelectedTokenIndex(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKeyFile) {
      addResponse("Error: Please select a private key file");
      return;
    }
    if (selectedTokenIndex === -1) {
      addResponse("Error: Please select a device token");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("privateKeyFile", privateKeyFile);
    formData.append("deviceToken", deviceTokens[selectedTokenIndex].token);
    formData.append("bundleId", bundleId);
    if (message) formData.append("message", message);
    if (data) formData.append("data", data);

    try {
      const response = await fetch(`${API_URL}/api/send-fcm`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      addResponse(JSON.stringify(responseData, null, 2));
    } catch (error: unknown) {
      addResponse(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addResponse = (content: string) => {
    setTotalResponses((prev) => prev + 1);
    setResponseHistory((prev) => [
      { timestamp: new Date(), content, isNew: true },
      ...prev.slice(0, 9),
    ]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        Firebase Cloud Messaging Tester
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="privateKeyFile"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Private Key File:
          </label>
          <input
            type="file"
            id="privateKeyFile"
            onChange={(e) => setPrivateKeyFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-2 p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-800 dark:text-blue-200 italic">
            Note: The private key file is processed securely on the server and
            is not persisted. It is disposed of immediately after each request
            for your security.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Device Tokens:
          </label>
          <div className="space-y-2">
            {deviceTokens.map((token, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`token-${index}`}
                  name="deviceToken"
                  checked={selectedTokenIndex === index}
                  onChange={() => setSelectedTokenIndex(index)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600"
                />
                <label
                  htmlFor={`token-${index}`}
                  className="flex-grow dark:text-gray-300"
                >
                  {token.label} - {token.token.substring(0, 20)}...
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveToken(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-800 dark:text-yellow-200 italic">
            Note: Device tokens are stored in your browser's local storage for
            convenience. They persist across sessions but are only accessible on
            this device.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="newTokenLabel"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Token Label:
            </label>
            <input
              type="text"
              id="newTokenLabel"
              value={newTokenLabel}
              onChange={(e) => setNewTokenLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="newTokenValue"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Token Value:
            </label>
            <input
              type="text"
              id="newTokenValue"
              value={newTokenValue}
              onChange={(e) => setNewTokenValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToken}
          className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Add Token
        </button>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Message:
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>

        <div>
          <label
            htmlFor="data"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Data (JSON):
          </label>
          <textarea
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder='{"key1": "value1", "key2": "value2"}'
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>

        <div>
          <label
            htmlFor="bundleId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Bundle ID:
          </label>
          <input
            type="text"
            id="bundleId"
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            placeholder="com.example.app"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-800 dark:text-yellow-200 italic">
            Note: This is your iOS app's bundle identifier used for APNS
            configuration.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full md:w-auto px-6 py-2 rounded-md text-white font-semibold ${
            isLoading
              ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          }`}
        >
          {isLoading ? "Sending..." : "Send FCM Message"}
        </button>
      </form>

      {responseHistory.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Response History:
          </h2>
          {responseHistory.map((entry, index) => (
            <div
              key={entry.timestamp.getTime()}
              className={`p-4 bg-gray-100 dark:bg-gray-700 rounded-md transition-all duration-300 ${
                entry.isNew ? "animate-pulse bg-blue-100 dark:bg-blue-900" : ""
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Response {totalResponses - index}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {entry.timestamp.toLocaleString()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300 overflow-x-auto">
                {entry.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FcmTester;
