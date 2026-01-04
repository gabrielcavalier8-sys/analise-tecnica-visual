"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, ArrowUp, ArrowDown, Loader2, AlertCircle, TrendingUp, Activity, Download, X, Share, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Fibonacci = {
  nivel_atual: string;
  suporte_chave: string;
  resistencia_chave: string;
  projecao: string;
};

type Elliott = {
  padrao_atual: string;
  onda_atual: string;
  fase: string;
  proximo_movimento: string;
};

type Analise = {
  direcao: "COMPRA" | "VENDA" | "INDEFINIDO";
  probabilidade: string;
  indicador_visual: "SETA_VERDE_CIMA" | "SETA_VERMELHA_BAIXO" | "NEUTRO";
  analise_resumida: string;
  fibonacci?: Fibonacci;
  elliott?: Elliott;
};

export default function Home() {
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [imagemCapturada, setImagemCapturada] = useState<string | null>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [mostrarBotaoIOS, setMostrarBotaoIOS] = useState(false);
  const [mostrarModalIOS, setMostrarModalIOS] = useState(false);
  const [mostrarModalPermissao, setMostrarModalPermissao] = useState(false);
  const [permissaoCameraNegada, setPermissaoCameraNegada] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Registrar Service Worker para PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registrado:', registration);
          })
          .catch((error) => {
            console.log('Erro ao registrar Service Worker:', error);
          });
      });
    }

    // Detectar se é iOS e se não está instalado como PWA
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      setMostrarBotaoIOS(true);
    }
  }, []);

  const handleDownloadIOS = () => {
    setMostrarModalIOS(true);
  };

  const verificarPermissaoCamera = async () => {
    try {
      // Verificar se a API de permissões está disponível
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        if (result.state === 'denied') {
          setPermissaoCameraNegada(true);
          setErro("Permissão de câmera negada. Clique no botão abaixo para ver como habilitar.");
          return false;
        }
      }
      return true;
    } catch (error) {
      // Se a API de permissões não estiver disponível, tenta solicitar diretamente
      console.log("API de permissões não disponível, tentando acesso direto");
      return true;
    }
  };

  const solicitarPermissaoCamera = async () => {
    try {
      setErro(null);
      setMostrarModalPermissao(false);
      setPermissaoCameraNegada(false);
      
      // Verificar permissão primeiro
      const temPermissao = await verificarPermissaoCamera();
      if (!temPermissao) {
        return;
      }

      // Solicitar permissão explícita da câmera
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error("Erro ao reproduzir vídeo:", err);
            setErro("Erro ao iniciar visualização da câmera.");
          });
        };
        
        setCameraAtiva(true);
        setPermissaoCameraNegada(false);
      }
    } catch (error: any) {
      console.error("Erro ao acessar câmera:", error);
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissaoCameraNegada(true);
        setErro("Permissão de câmera negada. Use o botão 'Fazer Upload' ou veja como habilitar a câmera abaixo.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErro("Nenhuma câmera encontrada. Use o botão 'Fazer Upload' para enviar uma imagem.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setErro("Câmera está sendo usada por outro aplicativo. Feche outros apps ou use o botão 'Fazer Upload'.");
      } else if (error.name === "OverconstrainedError") {
        // Tentar com configuração mais simples
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            streamRef.current = simpleStream;
            videoRef.current.play();
            setCameraAtiva(true);
            setErro(null);
            setPermissaoCameraNegada(false);
          }
        } catch (fallbackError) {
          setPermissaoCameraNegada(true);
          setErro("Não foi possível acessar a câmera. Use o botão 'Fazer Upload' para enviar uma imagem.");
        }
      } else {
        setPermissaoCameraNegada(true);
        setErro("Erro ao acessar a câmera. Use o botão 'Fazer Upload' ou verifique as permissões.");
      }
    }
  };

  const iniciarCamera = async () => {
    // Detectar se é iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Mostrar modal de permissão para iOS
      setMostrarModalPermissao(true);
    } else {
      // Para outros dispositivos, solicitar diretamente
      await solicitarPermissaoCamera();
    }
  };

  const pararCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraAtiva(false);
  };

  const capturarImagem = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imagemBase64 = canvas.toDataURL("image/jpeg", 0.8);
      setImagemCapturada(imagemBase64);
      pararCamera();
      analisarGrafico(imagemBase64);
    }
  };

  const handleUploadImagem = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      setErro("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imagemBase64 = e.target?.result as string;
      setImagemCapturada(imagemBase64);
      setErro(null);
      analisarGrafico(imagemBase64);
    };
    reader.onerror = () => {
      setErro("Erro ao ler o arquivo. Tente novamente.");
    };
    reader.readAsDataURL(file);
  };

  const abrirSeletorArquivo = () => {
    fileInputRef.current?.click();
  };

  const analisarGrafico = async (imagemBase64: string) => {
    setAnalisando(true);
    setErro(null);
    setResultado(null);

    try {
      const response = await fetch("/api/analisar-grafico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imagem: imagemBase64 }),
      });

      if (!response.ok) {
        throw new Error("Erro ao analisar o gráfico");
      }

      const data = await response.json();
      setResultado(data);
    } catch (error) {
      setErro("Erro ao analisar o gráfico. Tente novamente.");
      console.error(error);
    } finally {
      setAnalisando(false);
    }
  };

  const novaAnalise = () => {
    setResultado(null);
    setImagemCapturada(null);
    setErro(null);
    setPermissaoCameraNegada(false);
  };

  const mostrarInstrucoesPermissao = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;
    
    let instrucoes = "";
    
    if (isIOS) {
      instrucoes = `📱 iPhone/iPad (Safari):
1. Abra Ajustes do iOS
2. Role até encontrar "Safari"
3. Toque em "Câmera"
4. Selecione "Permitir"
5. Volte ao app e recarregue a página`;
    } else if (isChrome) {
      instrucoes = `🌐 Google Chrome:
1. Clique no ícone de cadeado/informações na barra de endereço
2. Procure por "Câmera"
3. Altere para "Permitir"
4. Recarregue a página`;
    } else if (isSafari) {
      instrucoes = `🧭 Safari (Mac):
1. Vá em Safari → Configurações
2. Clique em "Sites"
3. Selecione "Câmera"
4. Encontre este site e altere para "Permitir"
5. Recarregue a página`;
    } else {
      instrucoes = `🌐 Navegador:
1. Clique no ícone de configurações/permissões na barra de endereço
2. Procure por "Câmera" ou "Permissões"
3. Altere para "Permitir"
4. Recarregue a página`;
    }
    
    setErro(instrucoes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Trading AI Analyzer
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            Análise com Fibonacci e Ondas de Elliott
          </p>
        </div>

        {/* Input oculto para upload de arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadImagem}
          className="hidden"
        />

        {/* Botão Download iOS */}
        {mostrarBotaoIOS && (
          <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-500 backdrop-blur-sm p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-white font-semibold text-sm sm:text-base mb-1">
                  📱 Instale o App no iOS
                </p>
                <p className="text-blue-100 text-xs sm:text-sm">
                  Adicione à tela inicial para acesso rápido
                </p>
              </div>
              <Button
                onClick={handleDownloadIOS}
                className="bg-white hover:bg-blue-50 text-blue-600 font-semibold px-4 py-2 flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Instalar</span>
              </Button>
            </div>
          </Card>
        )}

        {/* Modal de Instruções iOS */}
        {mostrarModalIOS && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="bg-slate-800 border-slate-700 max-w-md w-full p-6 relative animate-in zoom-in duration-200">
              <Button
                onClick={() => setMostrarModalIOS(false)}
                variant="ghost"
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Instalar no iOS
                </h2>
                <p className="text-slate-300 text-sm">
                  Siga os passos abaixo para adicionar o app à sua tela inicial
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-4 items-start bg-slate-900/50 rounded-lg p-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">Abra o menu de compartilhar</p>
                    <p className="text-slate-400 text-sm">
                      Toque no ícone <Share className="w-4 h-4 inline mx-1" /> (compartilhar) na barra inferior do Safari
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-slate-900/50 rounded-lg p-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">Adicionar à Tela de Início</p>
                    <p className="text-slate-400 text-sm">
                      Role para baixo e toque em "Adicionar à Tela de Início"
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-slate-900/50 rounded-lg p-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">Confirme a instalação</p>
                    <p className="text-slate-400 text-sm">
                      Toque em "Adicionar" no canto superior direito
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                <p className="text-green-300 text-sm text-center">
                  ✅ O app será instalado na sua tela inicial e funcionará como um aplicativo nativo!
                </p>
              </div>

              <Button
                onClick={() => setMostrarModalIOS(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                Entendi
              </Button>
            </Card>
          </div>
        )}

        {/* Modal de Permissão da Câmera (iOS) */}
        {mostrarModalPermissao && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="bg-slate-800 border-slate-700 max-w-md w-full p-6 relative animate-in zoom-in duration-200">
              <Button
                onClick={() => setMostrarModalPermissao(false)}
                variant="ghost"
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Permissão da Câmera
                </h2>
                <p className="text-slate-300 text-sm">
                  O app precisa acessar sua câmera para analisar gráficos de trading
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-blue-200 text-sm mb-3">
                  📸 Quando você clicar em "Permitir Câmera", o navegador solicitará permissão.
                </p>
                <p className="text-blue-200 text-sm">
                  ✅ Toque em <strong>"Permitir"</strong> para continuar
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 text-xs">
                  <strong>Se a permissão for negada:</strong><br/>
                  Vá em Ajustes → Safari → Câmera → Permitir
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={solicitarPermissaoCamera}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Permitir Câmera
                </Button>
                <Button
                  onClick={() => {
                    setMostrarModalPermissao(false);
                    abrirSeletorArquivo();
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Fazer Upload
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Área da Câmera/Resultado */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden mb-6">
          <div className="relative aspect-video bg-slate-900/50">
            {!cameraAtiva && !imagemCapturada && !resultado && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                <Camera className="w-16 h-16 sm:w-20 sm:h-20 text-slate-500" />
                <p className="text-slate-400 text-center text-sm sm:text-base">
                  Use a câmera ou faça upload de uma imagem do gráfico
                </p>
              </div>
            )}

            {cameraAtiva && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {imagemCapturada && !analisando && (
              <img
                src={imagemCapturada}
                alt="Gráfico capturado"
                className="w-full h-full object-cover"
              />
            )}

            {analisando && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400 animate-spin" />
                <p className="text-white font-medium text-sm sm:text-base">
                  Analisando com Fibonacci e Elliott...
                </p>
              </div>
            )}

            {resultado && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                {resultado.indicador_visual === "SETA_VERDE_CIMA" && (
                  <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                    <ArrowUp className="w-24 h-24 sm:w-32 sm:h-32 text-green-500 stroke-[3]" />
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-green-500 mb-1">
                        COMPRA
                      </p>
                      <p className="text-xl sm:text-2xl text-white font-semibold">
                        {resultado.probabilidade}
                      </p>
                    </div>
                  </div>
                )}

                {resultado.indicador_visual === "SETA_VERMELHA_BAIXO" && (
                  <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                    <ArrowDown className="w-24 h-24 sm:w-32 sm:h-32 text-red-500 stroke-[3]" />
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-red-500 mb-1">
                        VENDA
                      </p>
                      <p className="text-xl sm:text-2xl text-white font-semibold">
                        {resultado.probabilidade}
                      </p>
                    </div>
                  </div>
                )}

                {resultado.indicador_visual === "NEUTRO" && (
                  <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                    <AlertCircle className="w-24 h-24 sm:w-32 sm:h-32 text-yellow-500 stroke-[3]" />
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-yellow-500 mb-1">
                        INDEFINIDO
                      </p>
                      <p className="text-lg sm:text-xl text-white">
                        Aguarde melhor momento
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Análise Detalhada */}
        {resultado && (
          <>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm p-4 sm:p-6 mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
                Análise Técnica
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {resultado.analise_resumida}
              </p>
            </Card>

            {/* Análise de Fibonacci */}
            {resultado.fibonacci && (
              <Card className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border-amber-700/50 backdrop-blur-sm p-4 sm:p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg sm:text-xl font-semibold text-amber-100">
                    Análise de Fibonacci
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-900/30 rounded-lg p-3">
                    <p className="text-xs text-amber-300/70 mb-1">Nível Atual</p>
                    <p className="text-sm sm:text-base text-amber-100 font-medium">
                      {resultado.fibonacci.nivel_atual}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <p className="text-xs text-green-300/70 mb-1">Suporte Chave</p>
                      <p className="text-sm text-green-100 font-medium">
                        {resultado.fibonacci.suporte_chave}
                      </p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <p className="text-xs text-red-300/70 mb-1">Resistência Chave</p>
                      <p className="text-sm text-red-100 font-medium">
                        {resultado.fibonacci.resistencia_chave}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-900/30 rounded-lg p-3">
                    <p className="text-xs text-amber-300/70 mb-1">Projeção</p>
                    <p className="text-sm sm:text-base text-amber-100 font-medium">
                      {resultado.fibonacci.projecao}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Análise de Ondas de Elliott */}
            {resultado.elliott && (
              <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-700/50 backdrop-blur-sm p-4 sm:p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg sm:text-xl font-semibold text-cyan-100">
                    Ondas de Elliott
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <p className="text-xs text-cyan-300/70 mb-1">Padrão Atual</p>
                      <p className="text-sm text-cyan-100 font-medium">
                        {resultado.elliott.padrao_atual}
                      </p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <p className="text-xs text-cyan-300/70 mb-1">Onda Atual</p>
                      <p className="text-sm text-cyan-100 font-medium">
                        {resultado.elliott.onda_atual}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-900/30 rounded-lg p-3">
                    <p className="text-xs text-cyan-300/70 mb-1">Fase</p>
                    <p className="text-sm sm:text-base text-cyan-100 font-medium">
                      {resultado.elliott.fase}
                    </p>
                  </div>
                  <div className="bg-slate-900/30 rounded-lg p-3">
                    <p className="text-xs text-cyan-300/70 mb-1">Próximo Movimento</p>
                    <p className="text-sm sm:text-base text-cyan-100 font-medium">
                      {resultado.elliott.proximo_movimento}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Aviso Legal */}
            <Card className="bg-yellow-500/10 border-yellow-500/30 backdrop-blur-sm p-3 sm:p-4 mb-6">
              <p className="text-yellow-200 text-xs sm:text-sm">
                ⚠️ Análise probabilística baseada em gráfico. Não é recomendação financeira.
              </p>
            </Card>
          </>
        )}

        {/* Erro */}
        {erro && (
          <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-sm p-4 mb-4">
            <p className="text-red-300 text-sm sm:text-base whitespace-pre-line mb-3">{erro}</p>
            {permissaoCameraNegada && (
              <Button
                onClick={mostrarInstrucoesPermissao}
                variant="outline"
                className="w-full border-red-500/50 text-red-300 hover:bg-red-500/10"
              >
                Ver instruções detalhadas
              </Button>
            )}
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!cameraAtiva && !resultado && (
            <>
              <Button
                onClick={iniciarCamera}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 text-base sm:text-lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Usar Câmera
              </Button>
              <Button
                onClick={abrirSeletorArquivo}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 py-6 text-base sm:text-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Fazer Upload
              </Button>
            </>
          )}

          {cameraAtiva && (
            <>
              <Button
                onClick={capturarImagem}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6 text-base sm:text-lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capturar e Analisar
              </Button>
              <Button
                onClick={pararCamera}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 py-6 text-base sm:text-lg"
              >
                Cancelar
              </Button>
            </>
          )}

          {resultado && (
            <Button
              onClick={novaAnalise}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-6 text-base sm:text-lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Nova Análise
            </Button>
          )}
        </div>

        {/* Informações */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-xs sm:text-sm">
            Análise técnica avançada com Fibonacci e Ondas de Elliott
          </p>
        </div>
      </div>
    </div>
  );
}
