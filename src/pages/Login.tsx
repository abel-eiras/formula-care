/**
 * Página de Login
 * Punto de entrada al sistema.
 * En el primer arranque de una instalación (sin usuarios todavía) muestra
 * en su lugar un formulario para crear la cuenta de administrador inicial.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setupInicial, isAuthenticated, isLoading: authLoading, error: authError } = useAuthContext();

  // Nombre de la aplicación
  const nombreApp = 'Fórmula Care';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Primer arranque: si la instalación no tiene ningún usuario todavía,
  // se muestra el formulario de alta del administrador en vez del login.
  const [comprobandoSetup, setComprobandoSetup] = useState(true);
  const [necesitaSetup, setNecesitaSetup] = useState(false);

  useEffect(() => {
    api.get<{ necesitaSetup: boolean }>('/auth/necesita-setup')
      .then((data) => setNecesitaSetup(data.necesitaSetup))
      .catch(() => setNecesitaSetup(false))
      .finally(() => setComprobandoSetup(false));
  }, []);

  // Mensaje al llegar desde establecer-contrasena
  useEffect(() => {
    const mensaje = (location.state as { mensaje?: string } | null)?.mensaje;
    if (mensaje) {
      toast.success(mensaje);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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

    if (necesitaSetup) {
      if (!email || !password || !nombre) {
        setError('Por favor, completa todos los campos');
        setIsSubmitting(false);
        return;
      }

      const success = await setupInicial(email, password, nombre);
      if (success) {
        navigate('/');
      } else {
        setError(authError || 'Error al crear la cuenta de administrador');
      }
      setIsSubmitting(false);
      return;
    }

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

  // Mostrar loading mientras se verifica autenticación inicial o si hace falta setup
  if (authLoading || comprobandoSetup) {
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
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <img src="/logo.webp" alt="Fórmula Care" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{nombreApp}</h1>
          <p className="text-muted-foreground mt-1">
            {necesitaSetup ? 'Configuración inicial' : 'Gestión de servicios de farmacia'}
          </p>
        </div>

        {/* Formulario de login / setup inicial */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {necesitaSetup ? 'Crear cuenta de administrador' : 'Iniciar Sesión'}
            </CardTitle>
            <CardDescription>
              {necesitaSetup
                ? 'Esta instalación es nueva: crea la primera cuenta para empezar a usar la app.'
                : 'Introduce tus credenciales para acceder al panel'}
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

              {/* Nombre (solo en setup inicial) */}
              {necesitaSetup && (
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Tu nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="pl-10"
                      autoComplete="name"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
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
                    autoComplete={necesitaSetup ? 'new-password' : 'current-password'}
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
                    {necesitaSetup ? 'Creando cuenta...' : 'Iniciando sesión...'}
                  </>
                ) : necesitaSetup ? (
                  'Crear cuenta y entrar'
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

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} {nombreApp}. Software libre bajo licencia MIT.
        </p>
      </div>
    </div>
  );
}
