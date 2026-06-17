'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  console.log("Intentando iniciar sesión con:", email) // <-- NUEVO

  const supabase = createClient()
  
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // IMPRIMIMOS EL ERROR EXACTO EN LA TERMINAL
  if (error) {
    console.error("ERROR DE SUPABASE:", error.message)
    return redirect('/login?error=' + error.message) // Ahora mostrará el error real en la pantalla
  }

  console.log("¡LOGIN EXITOSO! Redirigiendo...") // <-- NUEVO

  const rol = data.user?.user_metadata?.rol
  
  if (rol === 'REPARTIDOR') {
    redirect('/repartidor')
  } else {
    redirect('/admin')
  }
}