import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Eye, EyeOff, ArrowLeft, User, Lock, Shield } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  identifier: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: any) => {
    setServerError('')
    setLoading(true)
    try {
      await login(data.identifier, data.password, 'ADMIN')
      navigate('/admin')
    } catch (err: any) {
      setServerError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-dark flex flex-col items-center justify-center p-6">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white font-inter text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Kiosk
      </Link>

      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Shield className="w-10 h-10 text-primary-dark" />
          </div>
          <h1 className="text-white font-poppins font-bold text-2xl">Administrator</h1>
          <p className="text-white/50 font-inter text-sm mt-1">SMARTCLASS Management Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />
          <div className="p-8">
            <h2 className="text-card-title font-poppins font-semibold text-text-primary mb-1">
              Admin Sign In
            </h2>
            <p className="text-text-secondary font-inter text-sm mb-6">
              Restricted access — authorized personnel only
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Username"
                placeholder="admin"
                icon={<User className="w-4 h-4" />}
                error={(errors as any).identifier?.message}
                autoComplete="username"
                {...register('identifier')}
              />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-secondary hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={(errors as any).password?.message}
                autoComplete="current-password"
                {...register('password')}
              />

              {serverError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm font-inter">
                  {serverError}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
                Sign In to Admin Portal
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-white/30 font-inter text-xs mt-6">
          Not an administrator?{' '}
          <Link to="/login" className="text-white/50 hover:text-white underline transition-colors">
            Student / Teacher Login
          </Link>
        </p>
      </div>
    </div>
  )
}
