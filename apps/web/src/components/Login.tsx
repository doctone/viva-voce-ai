import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMutation } from '../hooks/useMutation'
import { loginFn } from '../routes/_authed'
import { signupFn } from '../routes/signup'
import { Auth } from './Auth'
import { Button } from './ui/Button'

export function Login() {
  const router = useRouter()

  const loginMutation = useMutation({
    fn: loginFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        await router.invalidate()
        router.navigate({ to: '/' })
        return
      }
    },
  })

  const signupMutation = useMutation({
    fn: useServerFn(signupFn),
  })

  return (
    <Auth
      actionText="Login"
      status={loginMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement)

        loginMutation.mutate({
          data: {
            email: formData.get('email') as string,
            password: formData.get('password') as string,
          },
        })
      }}
      afterSubmit={
        loginMutation.data ? (
          <>
            <div className="feedback-error">{loginMutation.data.message}</div>
            {loginMutation.data.error &&
            loginMutation.data.message === 'Invalid login credentials' ? (
              <div>
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    const formData = new FormData(
                      (e.target as HTMLButtonElement).form!,
                    )

                    signupMutation.mutate({
                      data: {
                        email: formData.get('email') as string,
                        password: formData.get('password') as string,
                      },
                    })
                  }}
                  type="button"
                >
                  Sign Up Instead
                </Button>
              </div>
            ) : null}
          </>
        ) : null
      }
    />
  )
}
