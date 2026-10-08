import React, { useState, useEffect, useMemo } from 'react';

import {
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Clock,
  Settings,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Server,
  Check,
  X,
  Search,
  Edit2,
  ArrowUpDown,
  LogOut,
  User as UserIcon,
  Lock,
  Mail,
  ArrowRight
} from 'lucide-react';


// ======================================================
// API CONFIG
// ======================================================

const getInitialApiUrl = () => {
  // Check for Vite environment variables first
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL
  ) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback for Create React App or Node environments
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_API_URL
  ) {
    return process.env.REACT_APP_API_URL;
  }

  // Default fallback for local development
  return 'http://localhost:5000';
};


// ======================================================
// APP
// ======================================================

export default function App() {

  // ====================================================
  // AUTH STATE
  // ====================================================

  const [token, setToken] = useState(
    localStorage.getItem('taskflow_token') || null
  );

  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem('taskflow_user') || null
  );

  const [isAuthMode, setIsAuthMode] = useState('login');

  const [authEmail, setAuthEmail] = useState('');

  const [authPassword, setAuthPassword] = useState('');

  const [authError, setAuthError] = useState('');

  const [isAuthLoading, setIsAuthLoading] = useState(false);


  // ====================================================
  // TODO STATE
  // ====================================================

  const [todos, setTodos] = useState([]);

  const [newTodoText, setNewTodoText] = useState('');

  const [filter, setFilter] = useState('all');

  const [sortBy, setSortBy] = useState('newest');

  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState(null);

  const [editingText, setEditingText] = useState('');

  const [deleteCandidate, setDeleteCandidate] = useState(null);


  // ====================================================
  // SETTINGS & NETWORK
  // ====================================================

  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pendingApiUrl, setPendingApiUrl] = useState(
    getInitialApiUrl
  );

  const [isConnected, setIsConnected] = useState(false);

  const [isLoading, setIsLoading] = useState(false);


  // ====================================================
  // REQUEST HEADERS
  // ====================================================

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {})
  });


  // ====================================================
  // LOGIN / REGISTER
  // ====================================================

  const handleAuth = async (e) => {
    e.preventDefault();

    setAuthError('');
    setIsAuthLoading(true);

    const endpoint =
      isAuthMode === 'login'
        ? '/api/auth/login'
        : '/api/auth/register';

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Authentication failed'
        );
      }

      setToken(data.token);

      setCurrentUser(data.email);

      localStorage.setItem(
        'taskflow_token',
        data.token
      );

      localStorage.setItem(
        'taskflow_user',
        data.email
      );

      setAuthPassword('');

      setAuthEmail('');

      setIsConnected(true);

    } catch (err) {
      setAuthError(err.message);

    } finally {
      setIsAuthLoading(false);
    }
  };


  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = () => {
    setToken(null);

    setCurrentUser(null);

    setTodos([]);

    localStorage.removeItem('taskflow_token');

    localStorage.removeItem('taskflow_user');
  };


  // ====================================================
  // FETCH TODOS
  // ====================================================

  const fetchTodos = async (targetUrl = apiUrl) => {

    if (!token) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `${targetUrl.replace(/\/$/, '')}/api/todos`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();

      setTodos(data);

      setIsConnected(true);

    } catch (err) {

      console.warn(
        'Backend issue:',
        err.message
      );

      setIsConnected(false);

    } finally {
      setIsLoading(false);
    }
  };


  // ====================================================
  // LOAD TODOS WHEN LOGIN
  // ====================================================

  useEffect(() => {
    if (token) {
      fetchTodos(apiUrl);
    }
  }, [apiUrl, token]);


  // ====================================================
  // ADD TODO
  // ====================================================

  const handleAddTodo = async (e) => {

    e.preventDefault();

    const trimmed = newTodoText.trim();

    if (!trimmed) return;

    const tempId = `local-${Date.now()}`;

    const newTodo = {
      _id: tempId,
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString()
    };

    setTodos((prev) => [
      newTodo,
      ...prev
    ]);

    setNewTodoText('');

    try {

      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            text: trimmed
          })
        }
      );

      if (response.status === 401) {
        return handleLogout();
      }

      if (!response.ok) {
        throw new Error(
          'Failed to create on server'
        );
      }

      const savedTodo = await response.json();

      setTodos((prev) =>
        prev.map((t) =>
          t._id === tempId
            ? savedTodo
            : t
        )
      );

    } catch (err) {

      console.error(
        'Error saving todo:',
        err
      );

      setTodos((prev) =>
        prev.filter(
          (t) => t._id !== tempId
        )
      );
    }
  };


  // ====================================================
  // COMPLETE TODO
  // ====================================================

  const handleToggleTodo = async (todo) => {

    const updatedStatus = !todo.completed;

    setTodos((prev) =>
      prev.map((t) =>
        t._id === todo._id
          ? {
              ...t,
              completed: updatedStatus
            }
          : t
      )
    );

    try {

      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos/${todo._id}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            completed: updatedStatus
          })
        }
      );

      if (response.status === 401) {
        handleLogout();
      }

    } catch (err) {

      setTodos((prev) =>
        prev.map((t) =>
          t._id === todo._id
            ? {
                ...t,
                completed: todo.completed
              }
            : t
        )
      );
    }
  };


  // ====================================================
  // START EDIT
  // ====================================================

  const handleStartEdit = (todo) => {

    setEditingId(todo._id);

    setEditingText(todo.text);
  };


  // ====================================================
  // SAVE EDIT
  // ====================================================

  const handleSaveEdit = async (id) => {

    const trimmed = editingText.trim();

    if (!trimmed) return;

    const previousTodos = [...todos];

    setTodos((prev) =>
      prev.map((t) =>
        t._id === id
          ? {
              ...t,
              text: trimmed,
              updatedAt: new Date().toISOString()
            }
          : t
      )
    );

    setEditingId(null);

    try {

      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos/${id}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            text: trimmed
          })
        }
      );

      if (response.status === 401) {
        handleLogout();
      }

      if (!response.ok) {
        throw new Error(
          'Update failed'
        );
      }

    } catch (err) {

      setTodos(previousTodos);
    }
  };


  // ====================================================
  // DELETE TODO
  // ====================================================

  const confirmDelete = async () => {

    if (!deleteCandidate) return;

    const targetId =
      deleteCandidate._id;

    setTodos((prev) =>
      prev.filter(
        (t) => t._id !== targetId
      )
    );

    setDeleteCandidate(null);

    try {

      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos/${targetId}`,
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      );

      if (response.status === 401) {
        handleLogout();
      }

    } catch (err) {

      console.error(
        'Error deleting:',
        err
      );
    }
  };


  // ====================================================
  // FORMAT DATE
  // ====================================================

  const formatDateTime = (isoDate) => {

    if (!isoDate) return '';

    try {

      return new Date(
        isoDate
      ).toLocaleString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );

    } catch {

      return '';
    }
  };


  // ====================================================
  // FILTER + SEARCH + SORT
  // ====================================================

  const filteredTodos = useMemo(() => {

    const result = todos.filter(
      (todo) => {

        const matchesFilter =
          filter === 'all'
            ? true
            : filter === 'active'
            ? !todo.completed
            : todo.completed;

        const matchesSearch =
          todo.text
            .toLowerCase()
            .includes(
              searchQuery.toLowerCase()
            );

        return (
          matchesFilter &&
          matchesSearch
        );
      }
    );

    return [...result].sort(
      (a, b) => {

        if (sortBy === 'newest') {
          return (
            new Date(
              b.createdAt || 0
            ).getTime() -
            new Date(
              a.createdAt || 0
            ).getTime()
          );
        }

        if (sortBy === 'oldest') {
          return (
            new Date(
              a.createdAt || 0
            ).getTime() -
            new Date(
              b.createdAt || 0
            ).getTime()
          );
        }

        if (sortBy === 'az') {
          return a.text.localeCompare(
            b.text,
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }

        if (sortBy === 'za') {
          return b.text.localeCompare(
            a.text,
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }

        if (sortBy === 'status') {
          return (
            Number(a.completed) -
            Number(b.completed)
          );
        }

        return 0;
      }
    );

  }, [
    todos,
    filter,
    searchQuery,
    sortBy
  ]);


  // ====================================================
  // LOGIN / REGISTER PAGE
  // ====================================================

  if (!token) {

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

        {/* API SETTINGS */}

        <button
          onClick={() =>
            setIsSettingsOpen(true)
          }
          title="API Configuration"
          className="
            absolute
            top-6
            right-6
            p-2.5
            rounded-xl
            bg-white
            border
            border-gray-200
            text-gray-500
            hover:text-green-600
            hover:border-green-200
            transition
          "
        >
          <Settings className="w-5 h-5" />
        </button>


        {/* LOGIN CARD */}

        <div
          className="
            w-full
            max-w-sm
            bg-white
            border
            border-gray-200
            p-8
            rounded-3xl
            shadow-sm
          "
        >

          {/* LOGO */}

          <div className="flex justify-center mb-6">

            <div
              className="
                p-3.5
                bg-green-600
                rounded-2xl
                shadow-sm
              "
            >
              <Sparkles
                className="w-8 h-8 text-white"
              />
            </div>

          </div>


          {/* TITLE */}

          <h1
            className="
              text-2xl
              font-bold
              text-center
              text-gray-800
              mb-2
            "
          >
            TaskFlow
          </h1>

          <p
            className="
              text-center
              text-gray-500
              text-sm
              mb-8
            "
          >
            {isAuthMode === 'login'
              ? 'Sign in to manage your tasks.'
              : 'Create an account to get started.'}
          </p>


          {/* ERROR */}

          {authError && (

            <div
              className="
                mb-4
                bg-red-50
                border
                border-red-200
                text-red-600
                text-xs
                p-3
                rounded-xl
                flex
                gap-2
              "
            >

              <AlertCircle
                className="w-4 h-4 shrink-0"
              />

              <span>
                {authError}
              </span>

            </div>
          )}


          {/* AUTH FORM */}

          <form
            onSubmit={handleAuth}
            className="flex flex-col gap-4"
          >

            {/* EMAIL */}

            <div className="relative">

              <Mail
                className="
                  w-4
                  h-4
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) =>
                  setAuthEmail(
                    e.target.value
                  )
                }
                placeholder="Email address"
                className="
                  w-full
                  bg-white
                  border
                  border-gray-200
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  text-sm
                  text-gray-800
                  placeholder-gray-400
                  focus:outline-none
                  focus:border-green-500
                  focus:ring-2
                  focus:ring-green-100
                "
              />

            </div>


            {/* PASSWORD */}

            <div className="relative">

              <Lock
                className="
                  w-4
                  h-4
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) =>
                  setAuthPassword(
                    e.target.value
                  )
                }
                placeholder="Password"
                className="
                  w-full
                  bg-white
                  border
                  border-gray-200
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  text-sm
                  text-gray-800
                  placeholder-gray-400
                  focus:outline-none
                  focus:border-green-500
                  focus:ring-2
                  focus:ring-green-100
                "
              />

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="
                mt-2
                w-full
                bg-green-600
                hover:bg-green-700
                text-white
                rounded-xl
                py-3
                text-sm
                font-medium
                transition
                flex
                items-center
                justify-center
                gap-2
                disabled:opacity-50
              "
            >

              {isAuthLoading
                ? 'Please wait...'
                : isAuthMode === 'login'
                ? 'Sign In'
                : 'Create Account'}

              {!isAuthLoading && (
                <ArrowRight
                  className="w-4 h-4"
                />
              )}

            </button>

          </form>


          {/* SWITCH LOGIN / REGISTER */}

          <div
            className="
              mt-6
              text-center
              text-sm
            "
          >

            <span className="text-gray-500">

              {isAuthMode === 'login'
                ? "Don't have an account? "
                : "Already have an account? "}

            </span>

            <button
              onClick={() =>
                setIsAuthMode(
                  isAuthMode === 'login'
                    ? 'register'
                    : 'login'
                )
              }
              className="
                text-green-600
                hover:text-green-700
                font-medium
                transition
              "
            >

              {isAuthMode === 'login'
                ? 'Sign up'
                : 'Log in'}

            </button>

          </div>

        </div>


        {/* LOGIN API SETTINGS MODAL */}

        {isSettingsOpen && (

          <div
            className="
              fixed
              inset-0
              z-50
              bg-black/30
              backdrop-blur-sm
              flex
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                bg-white
                border
                border-gray-200
                rounded-2xl
                w-full
                max-w-md
                p-6
                shadow-xl
                relative
              "
            >

              <button
                onClick={() =>
                  setIsSettingsOpen(false)
                }
                className="
                  absolute
                  top-4
                  right-4
                  text-gray-400
                  hover:text-gray-700
                "
              >
                <X className="w-5 h-5" />
              </button>


              <h2
                className="
                  text-lg
                  font-semibold
                  text-gray-800
                  flex
                  items-center
                  gap-2
                "
              >

                <Server
                  className="
                    w-5
                    h-5
                    text-green-600
                  "
                />

                API Environment Settings

              </h2>


              <div className="mt-4 flex flex-col gap-2">

                <label
                  className="
                    text-xs
                    font-medium
                    text-gray-600
                  "
                >
                  Backend URL
                </label>

                <input
                  type="text"
                  value={pendingApiUrl}
                  onChange={(e) =>
                    setPendingApiUrl(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-gray-50
                    border
                    border-gray-200
                    rounded-xl
                    px-3.5
                    py-2.5
                    text-xs
                    text-gray-700
                    focus:outline-none
                    focus:border-green-500
                  "
                />

              </div>


              <div
                className="
                  mt-6
                  flex
                  justify-end
                  gap-2.5
                "
              >

                <button
                  onClick={() =>
                    setIsSettingsOpen(false)
                  }
                  className="
                    px-4
                    py-2
                    rounded-xl
                    text-xs
                    text-gray-500
                    hover:bg-gray-100
                  "
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setApiUrl(
                      pendingApiUrl
                    );
                    setIsSettingsOpen(false);
                  }}
                  className="
                    px-4
                    py-2
                    rounded-xl
                    text-xs
                    bg-green-600
                    hover:bg-green-700
                    text-white
                    font-medium
                  "
                >
                  Save
                </button>

              </div>

            </div>

          </div>

        )}

      </div>
    );
  }


  // ====================================================
  // MAIN TODO PAGE
  // ====================================================

  return (

    <div
      className="
        min-h-screen
        bg-gray-50
        text-gray-800
        flex
        flex-col
        items-center
        py-8
        px-4
        sm:px-6
      "
    >

      <div
        className="
          w-full
          max-w-2xl
          flex
          flex-col
          gap-6
        "
      >


        {/* ==================================================
            HEADER
        ================================================== */}

        <header
          className="
            flex
            flex-col
            gap-4
            border-b
            border-gray-200
            pb-5
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
            "
          >

            {/* LOGO */}

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  p-2.5
                  bg-green-600
                  rounded-xl
                  shadow-sm
                "
              >

                <Sparkles
                  className="
                    w-6
                    h-6
                    text-white
                  "
                />

              </div>


              <div>

                <h1
                  className="
                    text-2xl
                    font-bold
                    tracking-tight
                    text-gray-800
                    flex
                    items-center
                    gap-2
                  "
                >
                  TaskFlow
                </h1>

                <p
                  className="
                    text-xs
                    text-gray-500
                  "
                >
                  Simple task management
                </p>

              </div>

            </div>


            {/* HEADER BUTTONS */}

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              {/* REFRESH */}

              <button
                onClick={() =>
                  fetchTodos(apiUrl)
                }
                title="Refresh"
                className="
                  p-2
                  rounded-lg
                  bg-white
                  border
                  border-gray-200
                  text-gray-500
                  hover:text-green-600
                  hover:border-green-200
                  transition
                "
              >

                <RefreshCw
                  className={`
                    w-4
                    h-4
                    ${
                      isLoading
                        ? 'animate-spin text-green-600'
                        : ''
                    }
                  `}
                />

              </button>


              {/* SETTINGS */}

              <button
                onClick={() =>
                  setIsSettingsOpen(true)
                }
                title="Settings"
                className="
                  p-2
                  rounded-lg
                  bg-white
                  border
                  border-gray-200
                  text-gray-500
                  hover:text-green-600
                  hover:border-green-200
                  transition
                "
              >

                <Settings
                  className="w-4 h-4"
                />

              </button>

            </div>

          </div>


          {/* USER BAR */}

          <div
            className="
              flex
              items-center
              justify-between
              text-xs
              px-3.5
              py-2.5
              rounded-xl
              border
              bg-white
              border-gray-200
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
                text-gray-600
              "
            >

              <UserIcon
                className="
                  w-3.5
                  h-3.5
                  text-green-600
                "
              />

              <span>
                Signed in as{' '}
                <strong
                  className="
                    font-medium
                    text-gray-800
                  "
                >
                  {currentUser}
                </strong>
              </span>

            </div>


            {/* LOGOUT */}

            <button
              onClick={handleLogout}
              className="
                flex
                items-center
                gap-1.5
                text-gray-500
                hover:text-red-500
                transition
              "
            >

              <LogOut
                className="w-3.5 h-3.5"
              />

              <span className="hidden sm:inline">
                Logout
              </span>

            </button>

          </div>

        </header>


        {/* ==================================================
            ADD TODO
        ================================================== */}

        <form
          onSubmit={handleAddTodo}
          className="relative group"
        >

          <div
            className="
              flex
              items-center
              gap-2
              p-1.5
              bg-white
              border
              border-gray-200
              rounded-2xl
              shadow-sm
              focus-within:border-green-500
              focus-within:ring-2
              focus-within:ring-green-100
              transition-all
            "
          >

            <input
              type="text"
              value={newTodoText}
              onChange={(e) =>
                setNewTodoText(
                  e.target.value
                )
              }
              placeholder="What needs to be done today?..."
              className="
                flex-1
                bg-transparent
                px-4
                py-3
                text-gray-800
                placeholder-gray-400
                text-sm
                focus:outline-none
              "
            />


            <button
              type="submit"
              disabled={!newTodoText.trim()}
              className="
                px-4
                py-2.5
                rounded-xl
                bg-green-600
                hover:bg-green-700
                text-white
                font-medium
                text-sm
                flex
                items-center
                gap-2
                transition
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >

              <Plus
                className="w-4 h-4"
              />

              <span>
                Add
              </span>

            </button>

          </div>

        </form>


        {/* ==================================================
            FILTER / SORT / SEARCH
        ================================================== */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            items-stretch
            sm:items-center
            justify-between
            gap-3
            pt-2
          "
        >

          {/* FILTER */}

          <div
            className="
              flex
              items-center
              bg-white
              border
              border-gray-200
              p-1
              rounded-xl
              text-xs
            "
          >

            {[
              'all',
              'active',
              'completed'
            ].map((f) => (

              <button
                key={f}
                onClick={() =>
                  setFilter(f)
                }
                className={`
                  px-3
                  py-1.5
                  rounded-lg
                  transition
                  font-medium
                  capitalize
                  ${
                    filter === f
                      ? 'bg-green-600 text-white'
                      : 'text-gray-500 hover:text-gray-800'
                  }
                `}
              >
                {f}
              </button>

            ))}

          </div>


          {/* SORT + SEARCH */}

          <div
            className="
              flex
              items-center
              gap-2
              flex-1
              sm:justify-end
            "
          >

            {/* SORT */}

            <div
              className="
                flex
                items-center
                gap-1.5
                bg-white
                border
                border-gray-200
                rounded-xl
                px-2.5
                py-1.5
                text-xs
                text-gray-600
              "
            >

              <ArrowUpDown
                className="
                  w-3.5
                  h-3.5
                  text-green-600
                "
              />

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value
                  )
                }
                className="
                  bg-transparent
                  text-gray-700
                  focus:outline-none
                  cursor-pointer
                "
              >

                <option value="newest">
                  Newest first
                </option>

                <option value="oldest">
                  Oldest first
                </option>

                <option value="az">
                  A → Z
                </option>

                <option value="za">
                  Z → A
                </option>

                <option value="status">
                  Pending first
                </option>

              </select>

            </div>


            {/* SEARCH */}

            <div
              className="
                relative
                flex-1
                max-w-[210px]
              "
            >

              <Search
                className="
                  w-3.5
                  h-3.5
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="Search..."
                className="
                  w-full
                  bg-white
                  border
                  border-gray-200
                  rounded-xl
                  pl-8
                  pr-2.5
                  py-1.5
                  text-xs
                  text-gray-700
                  focus:outline-none
                  focus:border-green-500
                "
              />

            </div>

          </div>

        </div>


        {/* ==================================================
            TODO LIST
        ================================================== */}

        <div
          className="
            flex
            flex-col
            gap-2.5
          "
        >

          {filteredTodos.length === 0 ? (

            /* EMPTY */

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                py-16
                px-4
                border
                border-dashed
                border-gray-300
                rounded-2xl
                bg-white
                text-center
              "
            >

              <CheckCircle2
                className="
                  w-8
                  h-8
                  text-green-500
                  mb-3
                "
              />

              <h3
                className="
                  text-sm
                  font-medium
                  text-gray-700
                "
              >
                No tasks found
              </h3>

              <p
                className="
                  text-xs
                  text-gray-400
                  mt-1
                  max-w-xs
                "
              >
                Nothing to see here right now.
              </p>

            </div>

          ) : (

            /* TODO ITEMS */

            filteredTodos.map((todo) => {

              const formattedDate =
                formatDateTime(
                  todo.createdAt ||
                  todo.timestamp
                );

              const isEditing =
                editingId === todo._id;


              return (

                <div
                  key={todo._id}
                  className={`
                    group
                    flex
                    items-start
                    gap-3
                    p-4
                    rounded-xl
                    border
                    transition-all
                    ${
                      todo.completed
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200 hover:border-green-200 hover:shadow-sm'
                    }
                  `}
                >

                  {/* TODO LEFT */}

                  <div
                    className="
                      flex
                      items-start
                      gap-3.5
                      flex-1
                      min-w-0
                    "
                  >

                    {/* CHECK BUTTON */}

                    <button
                      onClick={() =>
                        handleToggleTodo(
                          todo
                        )
                      }
                      disabled={isEditing}
                      className="
                        mt-0.5
                        text-gray-400
                        hover:text-green-600
                        transition
                      "
                    >

                      {todo.completed ? (

                        <CheckCircle2
                          className="
                            w-5
                            h-5
                            text-green-600
                          "
                        />

                      ) : (

                        <Circle
                          className="
                            w-5
                            h-5
                          "
                        />

                      )}

                    </button>


                    {/* TODO CONTENT */}

                    <div
                      className="
                        flex
                        flex-col
                        gap-1
                        flex-1
                      "
                    >

                      {isEditing ? (

                        /* EDIT INPUT */

                        <div
                          className="
                            flex
                            flex-col
                            gap-1.5
                          "
                        >

                          <input
                            type="text"
                            autoFocus
                            value={editingText}
                            onChange={(e) =>
                              setEditingText(
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {

                              if (
                                e.key ===
                                'Enter'
                              ) {
                                handleSaveEdit(
                                  todo._id
                                );
                              }

                              if (
                                e.key ===
                                'Escape'
                              ) {
                                setEditingId(
                                  null
                                );
                              }

                            }}
                            className="
                              bg-white
                              border
                              border-green-400
                              rounded-lg
                              px-2.5
                              py-1.5
                              text-sm
                              text-gray-800
                              focus:outline-none
                              focus:ring-2
                              focus:ring-green-100
                            "
                          />

                        </div>

                      ) : (

                        /* TODO TEXT */

                        <p
                          onDoubleClick={() =>
                            !todo.completed &&
                            handleStartEdit(
                              todo
                            )
                          }
                          className={`
                            text-sm
                            break-words
                            cursor-default
                            ${
                              todo.completed
                                ? 'line-through text-gray-400'
                                : 'text-gray-800'
                            }
                          `}
                        >
                          {todo.text}
                        </p>

                      )}


                      {/* DATE */}

                      {formattedDate &&
                        !isEditing && (

                          <div
                            className="
                              flex
                              items-center
                              gap-1.5
                              text-[11px]
                              text-gray-400
                            "
                          >

                            <Clock
                              className="
                                w-3
                                h-3
                              "
                            />

                            {formattedDate}

                            {todo.updatedAt &&
                              ' (edited)'}

                          </div>

                        )}

                    </div>

                  </div>


                  {/* ACTION BUTTONS */}

                  <div
                    className="
                      flex
                      items-center
                      gap-1
                    "
                  >

                    {isEditing ? (

                      /* SAVE / CANCEL */

                      <>
                        <button
                          onClick={() =>
                            handleSaveEdit(
                              todo._id
                            )
                          }
                          className="
                            p-1.5
                            text-green-600
                            hover:bg-green-50
                            rounded-lg
                          "
                          title="Save"
                        >
                          <Check
                            className="w-4 h-4"
                          />
                        </button>

                        <button
                          onClick={() =>
                            setEditingId(
                              null
                            )
                          }
                          className="
                            p-1.5
                            text-gray-400
                            hover:bg-gray-100
                            rounded-lg
                          "
                          title="Cancel"
                        >
                          <X
                            className="w-4 h-4"
                          />
                        </button>
                      </>

                    ) : (

                      /* EDIT / DELETE */

                      <>
                        <button
                          onClick={() =>
                            handleStartEdit(
                              todo
                            )
                          }
                          className="
                            p-1.5
                            text-gray-400
                            hover:text-green-600
                            hover:bg-green-50
                            rounded-lg
                            opacity-80
                            sm:opacity-0
                            group-hover:opacity-100
                            transition
                          "
                          title="Edit"
                        >
                          <Edit2
                            className="w-3.5 h-3.5"
                          />
                        </button>

                        <button
                          onClick={() =>
                            setDeleteCandidate(
                              todo
                            )
                          }
                          className="
                            p-1.5
                            text-gray-400
                            hover:text-red-500
                            hover:bg-red-50
                            rounded-lg
                            opacity-80
                            sm:opacity-0
                            group-hover:opacity-100
                            transition
                          "
                          title="Delete"
                        >
                          <Trash2
                            className="w-4 h-4"
                          />
                        </button>
                      </>

                    )}

                  </div>

                </div>

              );

            })

          )}

        </div>

      </div>


      {/* ==================================================
          API SETTINGS MODAL
      ================================================== */}

      {isSettingsOpen && (

        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/30
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-4
          "
        >

          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-2xl
              w-full
              max-w-md
              p-6
              relative
              shadow-xl
            "
          >

            {/* CLOSE */}

            <button
              onClick={() =>
                setIsSettingsOpen(false)
              }
              className="
                absolute
                top-4
                right-4
                text-gray-400
                hover:text-gray-700
              "
            >
              <X className="w-5 h-5" />
            </button>


            {/* TITLE */}

            <h2
              className="
                text-lg
                font-semibold
                text-gray-800
                flex
                items-center
                gap-2
              "
            >

              <Server
                className="
                  w-5
                  h-5
                  text-green-600
                "
              />

              API Settings

            </h2>


            {/* API INPUT */}

            <div className="mt-4">

              <input
                type="text"
                value={pendingApiUrl}
                onChange={(e) =>
                  setPendingApiUrl(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-gray-50
                  border
                  border-gray-200
                  rounded-xl
                  px-3.5
                  py-2.5
                  text-xs
                  text-gray-700
                  font-mono
                  focus:outline-none
                  focus:border-green-500
                "
              />

            </div>


            {/* ACTIONS */}

            <div
              className="
                mt-6
                flex
                justify-end
                gap-2.5
              "
            >

              <button
                onClick={() =>
                  setIsSettingsOpen(false)
                }
                className="
                  px-4
                  py-2
                  rounded-xl
                  text-xs
                  text-gray-500
                  hover:bg-gray-100
                "
              >
                Cancel
              </button>


              <button
                onClick={() => {

                  setApiUrl(
                    pendingApiUrl
                  );

                  setIsSettingsOpen(
                    false
                  );

                }}
                className="
                  px-4
                  py-2
                  rounded-xl
                  text-xs
                  bg-green-600
                  hover:bg-green-700
                  text-white
                  font-medium
                "
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ==================================================
          DELETE CONFIRMATION
      ================================================== */}

      {deleteCandidate && (

        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/30
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-4
          "
        >

          <div
            className="
              bg-white
              border
              border-gray-200
              rounded-2xl
              w-full
              max-w-sm
              p-6
              shadow-xl
            "
          >

            <h3
              className="
                font-semibold
                text-gray-800
                mb-2
              "
            >
              Delete Task?
            </h3>


            <p
              className="
                text-xs
                text-gray-500
                mb-5
              "
            >
              Remove "{deleteCandidate.text}"?
            </p>


            <div
              className="
                flex
                justify-end
                gap-2.5
              "
            >

              <button
                onClick={() =>
                  setDeleteCandidate(
                    null
                  )
                }
                className="
                  px-3.5
                  py-2
                  rounded-xl
                  text-xs
                  text-gray-500
                  hover:bg-gray-100
                "
              >
                Cancel
              </button>


              <button
                onClick={confirmDelete}
                className="
                  px-4
                  py-2
                  rounded-xl
                  text-xs
                  bg-red-500
                  hover:bg-red-600
                  text-white
                  font-medium
                "
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
