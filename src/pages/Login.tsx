/**
 * Página de Login
 * Punto de entrada al sistema
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail, Building2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading, error: authError } = useAuthContext();

  // Nombre genérico para login (no necesitamos autenticación para esto)
  const nombreFarmacia = 'Sistema de Gestión';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validación básica
    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      setIsSubmitting(false);
      return;
    }

    const success = await login(email, password);

    if (success) {
      navigate('/');
    } else {
      setError(authError || 'Error al iniciar sesión');
    }

    setIsSubmitting(false);
  };

  // Mostrar loading mientras se verifica autenticación inicial
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{nombreFarmacia}</h1>
          <p className="text-muted-foreground mt-1">Sistema de Gestión de Servicios</p>
        </div>

        {/* Formulario de login */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              Introduce tus credenciales para acceder al panel
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Mensaje de error */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              {/* Enlaces legales */}
              <div className="text-center text-xs text-muted-foreground space-y-2">
                <p>
                  Al acceder, aceptas nuestra{' '}
                  <Link to="/legal/privacidad" className="text-primary hover:underline">
                    Política de Privacidad
                  </Link>
                </p>
                <div className="flex justify-center gap-3">
                  <Link to="/legal/aviso-legal" className="text-primary hover:underline">
                    Aviso Legal
                  </Link>
                  <span>·</span>
                  <Link to="/legal/privacidad" className="text-primary hover:underline">
                    Privacidad
                  </Link>
                  <span>·</span>
                  <Link to="/legal/cookies" className="text-primary hover:underline">
                    Cookies
                  </Link>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Credenciales de desarrollo */}
        {import.meta.env.DEV && (
          <Card className="mt-4 border-dashed border-amber-300 bg-amber-50/50">
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700">Credenciales de desarrollo:</p>
              
              {/* Superadmin */}
              <div className="font-mono text-xs bg-white p-2 rounded border">
                <p className="text-[10px] font-semibold text-purple-700 mb-1">Superadmin (Gestión Plataforma)</p>
                <div className="space-y-1">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <code 
                      className="text-purple-800 cursor-pointer hover:bg-purple-100 px-1 rounded"
                      onClick={() => {
                        navigator.clipboard.writeText('superadmin@sistema.local');
                        setEmail('superadmin@sistema.local');
                      }}
                      title="Click para copiar y rellenar"
                    >
                      superadmin@sistema.local
                    </code>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Password:</span>
                    <code 
                      className="text-purple-800 cursor-pointer hover:bg-purple-100 px-1 rounded"
                      onClick={() => {
                        navigator.clipboard.writeText('superadmin123');
                        setPassword('superadmin123');
                      }}
                      title="Click para copiar y rellenar"
                    >
                      superadmin123
                    </code>
                  </p>
                </div>
              </div>

              {/* Admin Farmacia */}
              <div className="font-mono text-xs bg-white p-2 rounded border">
                <p className="text-[10px] font-semibold text-amber-700 mb-1">Admin Farmacia Demo</p>
                <div className="space-y-1">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <code 
                      className="text-amber-800 cursor-pointer hover:bg-amber-100 px-1 rounded"
                      onClick={() => {
                        navigator.clipboard.writeText('admin@farmaciapontevea.com');
                        setEmail('admin@farmaciapontevea.com');
                      }}
                      title="Click para copiar y rellenar"
                    >
                      admin@farmaciapontevea.com
                    </code>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Password:</span>
                    <code 
                      className="text-amber-800 cursor-pointer hover:bg-amber-100 px-1 rounded"
                      onClick={() => {
                        navigator.clipboard.writeText('admin123');
                        setPassword('admin123');
                      }}
                      title="Click para copiar y rellenar"
                    >
                      admin123
                    </code>
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-amber-600">
                Click en los valores para copiar y rellenar automáticamente
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} {nombreFarmacia}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
