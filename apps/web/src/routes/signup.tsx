import { Link, redirect, createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useMutation } from '../hooks/useMutation'
import { Auth } from '../components/Auth'
import { cn } from '~/lib/utils'
import { mutedTextClassName } from '~/lib/class-names'
import { getSupabaseServerClient } from '../utils/supabase-server'

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email: string; password: string; redirectUrl?: string }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    // Redirect to the prev page stored in the "redirect" search param
    throw redirect({
      href: data.redirectUrl || '/',
    })
  })

export const Route = createFileRoute('/signup')({
  component: Signup,
})

export function Signup() {
  const signupMutation = useMutation({
    fn: useServerFn(signupFn),
  })

  return (
    <Auth
      actionText="Sign up"
      status={signupMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement)

        signupMutation.mutate({
          data: {
            email: formData.get('email') as string,
            password: formData.get('password') as string,
          },
        })
      }}
      afterSubmit={
        signupMutation.data?.error ? (
          <div className={cn(mutedTextClassName, 'text-error')}>
            {signupMutation.data.message}
          </div>
        ) : null
      }
      footer={
        <p className={cn(mutedTextClassName, 'text-sm')}>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-on-surface underline">
            Log in
          </Link>
        </p>
      }
    />
  )
}
