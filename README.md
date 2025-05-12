# Geuse Chat

A 3D interactive chat interface that integrates with n8n's chat functionality. This project uses Three.js for the 3D visualization and @n8n/chat for the chat interface.

## Features

- 3D sphere of interactive chat sprites
- Smooth animations and transitions
- Integration with n8n chat webhook
- Responsive design
- Modern UI with CSS3D effects

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Development

- The development server runs on `http://localhost:5173` by default
- Hot module replacement (HMR) is enabled for faster development
- Source files are in the `src` directory
- Static assets should be placed in the `public` directory

## Project Structure

```
├── src/
│   ├── components/
│   ├── styles/
│   │   └── main.css
│   └── index.js
├── public/
├── index.html
├── package.json
└── README.md
```

## Dependencies

- three.js: ^0.160.0
- @n8n/chat: ^0.1.0
- vite: ^5.0.0

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT 