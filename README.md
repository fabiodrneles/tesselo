# Tesselo

Puzzle de geometria procedural — preencha o grid desenhando retângulos cujas áreas correspondem aos números das células.

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- Aplicativo **Expo Go** instalado no celular Android ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Instalação

```bash
git clone <repo-url>
cd tesselo
npm install
```

## Rodar no celular via USB (Android)

### 1. Habilitar Depuração USB no Android
1. Vá em **Configurações > Sobre o telefone**
2. Toque 7x em **Número da versão** para ativar o Modo Desenvolvedor
3. Vá em **Configurações > Opções do desenvolvedor**
4. Ative **Depuração USB**

### 2. Conectar e verificar o dispositivo

```bash
# Verifique se o dispositivo é reconhecido
adb devices
```

Deve aparecer algo como:
```
List of devices attached
XXXXXXXX    device
```

### 3. Iniciar o projeto

```bash
npx expo start
```

No terminal, pressione **`a`** para abrir diretamente no Android via USB.

> Alternativamente, escaneie o QR Code com o app **Expo Go** (certifique-se que o celular e o computador estão na mesma rede Wi-Fi).

### 4. Rodar build nativo (opcional, sem Expo Go)

```bash
npx expo run:android
```

> Requer Android Studio e SDK Android configurados.

## Estrutura do Projeto

```
tesselo/
├── App.tsx              # Entry point
├── src/
│   ├── components/
│   │   └── Grid.tsx     # Grid visual do puzzle
│   └── utils/
│       └── generator.ts # Motor de geração procedural (SLICE 2+)
├── tailwind.config.js   # Paleta Deep Slate & Neon
└── metro.config.js      # Configuração NativeWind
```

## Paleta de Cores

| Elemento | Hex | Descrição |
|----------|-----|-----------|
| Background | `#1A202C` | Deep Navy |
| Grid Lines | `#2D3748` | Cinza Azulado |
| Forma A | `#4FD1C5` | Teal Neon |
| Forma B | `#F6AD55` | Laranja Sunset |
| Forma C | `#B794F4` | Roxo Lavanda |
| Forma D | `#FC8181` | Coral Suave |
| Sucesso | `#68D391` | Verde Esmeralda |

## Slices de Desenvolvimento

- [x] SLICE 1 — Infraestrutura e Theme Engine
- [ ] SLICE 2 — Motor de Geração Procedural
- [ ] SLICE 3 — Gestos com PanGestureHandler
- [ ] SLICE 4 — Validação em Tempo Real
- [ ] SLICE 5 — Gamificação e Loop de UI
