import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDYwdjYwSDB6Ii8+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgc3Ryb2tlPSIjNEE5MEUyIiBzdHJva2Utd2lkdGg9Ii4yIiBvcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#1E3A5F] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6Ii8+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9Ii41IiBvcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
              <span className="text-white font-bold text-2xl relative z-10">В</span>
            </div>
            <span className="text-3xl font-bold text-gray-900">Версиум</span>
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
            Создавайте курсы<br />нового поколения
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Платформа с ИИ для автоматизации разработки образовательных курсов.
            Генерация, контроль качества и полная управляемость.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2ECC71]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#4A90E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700">Генерация курсов за минуты</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2ECC71]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#4A90E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700">Автоматическая проверка качества</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2ECC71]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#4A90E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700">Версионность и откат изменений</span>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
          <div className="lg:hidden mb-6">
            <Link to="/" className="flex items-center gap-2 justify-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4A90E2] to-[#1E3A5F] flex items-center justify-center">
                <span className="text-white font-bold text-xl">В</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Версиум</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignIn ? "Вход в систему" : "Регистрация"}
            </h2>
            <p className="text-gray-600">
              {isSignIn 
                ? "Введите свои данные для входа в Версиум"
                : "Создайте аккаунт для начала работы"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isSignIn && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Имя
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ваше имя"
                    className="w-full pl-12 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="example@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignIn && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-[#4A90E2] rounded border-gray-300 focus:ring-[#4A90E2]" />
                  <span className="text-sm text-gray-600">Запомнить меня</span>
                </label>
                <button type="button" className="text-sm text-[#4A90E2] hover:text-[#1E3A5F] font-semibold">
                  Забыли пароль?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors"
            >
              {isSignIn ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-600">
              {isSignIn ? "Нет аккаунта?" : "Уже есть аккаунт?"}
            </span>
            {" "}
            <button
              onClick={() => setIsSignIn(!isSignIn)}
              className="text-[#4A90E2] hover:text-[#1E3A5F] font-semibold transition-colors"
            >
              {isSignIn ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">или</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app")}
              className="mt-4 w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Войти как гость
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}