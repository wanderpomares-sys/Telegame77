/**
 * i18n-dom.js — Tradução (EN/ES) dos textos que o jogo monta em tempo de execução
 * (telas de estatísticas, conquistas, loja, pausa, resultado etc.).
 *
 * Como funciona: o idioma original do jogo é o português. Quando o idioma atual
 * não é "pt", este módulo observa a página e troca cada texto em português pela
 * tradução do dicionário abaixo (a busca ignora maiúsculas/minúsculas). Textos
 * sem tradução ficam em português — nunca quebram nada. Ao voltar para o
 * português, os textos originais são restaurados.
 */
const GameI18nDom = (function () {
  // [português, inglês, espanhol]
  const ROWS = [
    ['Jogar Agora', 'Play Now', 'Jugar ahora'],
    ['Jogar', 'Play', 'Jugar'],
    ['Iniciar', 'Start', 'Iniciar'],
    ['Pausar', 'Pause', 'Pausar'],
    ['Continuar', 'Continue', 'Continuar'],
    ['Reiniciar', 'Restart', 'Reiniciar'],
    ['Pausa', 'Pause', 'Pausa'],
    ['Sair da partida', 'Quit match', 'Salir de la partida'],
    ['Como jogar', 'How to play', 'Cómo jugar'],
    ['Menu', 'Menu', 'Menú'],
    ['Voltar', 'Back', 'Volver'],
    ['Voltar ao menu', 'Back to menu', 'Volver al menú'],
    ['Fechar', 'Close', 'Cerrar'],
    ['Cancelar', 'Cancel', 'Cancelar'],
    ['Entrar', 'Sign in', 'Entrar'],
    ['Praticar', 'Practice', 'Practicar'],
    ['Campeonato', 'Championship', 'Campeonato'],
    ['Campeonatos', 'Championships', 'Campeonatos'],
    ['Modos Especiais', 'Special Modes', 'Modos especiales'],
    ['Modos e jogos', 'Modes & games', 'Modos y juegos'],
    ['Loja', 'Shop', 'Tienda'],
    ['Loja & Sistema', 'Shop & System', 'Tienda y sistema'],
    ['Ranking', 'Ranking', 'Ranking'],
    ['Estatísticas', 'Statistics', 'Estadísticas'],
    ['Conquistas', 'Achievements', 'Logros'],
    ['Configurações', 'Settings', 'Ajustes'],
    ['Créditos', 'Credits', 'Créditos'],
    ['Sobre o jogo', 'About the game', 'Sobre el juego'],
    ['Tutorial • Regras 1977', 'Tutorial • 1977 rules', 'Tutorial • Reglas 1977'],
    ['Bolas • Raquetes • Arenas', 'Balls • Paddles • Arenas', 'Pelotas • Palas • Arenas'],
    ['Entrar em ação', 'Get in the game', 'Entra en acción'],
    ['Criado por', 'Created by', 'Creado por'],
    ['Criado por Wander Pomares', 'Created by Wander Pomares', 'Creado por Wander Pomares'],
    ['Novo', 'NEW', 'NUEVO'],
    ['Em breve', 'Coming soon', 'Próximamente'],
    ['Trocar jogador', 'Switch player', 'Cambiar jugador'],
    ['Seu nome de jogador', 'Your player name', 'Tu nombre de jugador'],
    ['Digite seu nome acima pra entrar', 'Type your name above to sign in', 'Escribe tu nombre arriba para entrar'],
    ['Partida rápida • Contra a CPU', 'Quick match • Versus CPU', 'Partida rápida • Contra la CPU'],
    ['Áudio • Gráficos • Idioma', 'Audio • Graphics • Language', 'Audio • Gráficos • Idioma'],
    ['Música', 'Music', 'Música'],
    ['Música de fundo', 'Background music', 'Música de fondo'],
    ['Música on', 'Music on', 'Música on'],
    ['Música off', 'Music off', 'Música off'],
    ['Som', 'Sound', 'Sonido'],
    ['Efeitos sonoros e feedback', 'Sound effects and feedback', 'Efectos de sonido y respuesta'],
    ['Trilha de fundo', 'Background track', 'Pista de fondo'],
    ['Áudio', 'Audio', 'Audio'],
    ['Gráficos', 'Graphics', 'Gráficos'],
    ['Tema', 'Theme', 'Tema'],
    ['Idioma', 'Language', 'Idioma'],
    ['Conta', 'Account', 'Cuenta'],
    ['Auto', 'Auto', 'Auto'],
    ['3D alto', '3D high', '3D alto'],
    ['3D leve', '3D light', '3D ligero'],
    ['Clássico 2D', 'Classic 2D', 'Clásico 2D'],
    ['Premium', 'Premium', 'Premium'],
    ['Pixel art', 'Pixel art', 'Pixel art'],
    ['Português', 'Portuguese', 'Portugués'],
    ['Ligado', 'On', 'Activado'],
    ['Salvo neste aparelho', 'Saved on this device', 'Guardado en este dispositivo'],
    ['Ranking salvo neste aparelho', 'Ranking saved on this device', 'Ranking guardado en este dispositivo'],
    ['Automático ajusta conforme o desempenho do seu aparelho · atual: leve', 'Automatic adapts to your device performance · current: light', 'Automático se ajusta al rendimiento de tu dispositivo · actual: ligero'],
    ['Automático ajusta conforme o desempenho do seu aparelho · atual: alto', 'Automatic adapts to your device performance · current: high', 'Automático se ajusta al rendimiento de tu dispositivo · actual: alto'],
    ['Automático ajusta conforme o desempenho do seu aparelho · atual: clássico', 'Automatic adapts to your device performance · current: classic', 'Automático se ajusta al rendimiento de tu dispositivo · actual: clásico'],
    ['+500 moedas (teste)', '+500 coins (test)', '+500 monedas (prueba)'],
    // Jogos e dificuldade
    ['Paredão', 'Wall', 'Pared'],
    ['Tênis', 'Tennis', 'Tenis'],
    ['Futebol', 'Soccer', 'Fútbol'],
    ['Barreira', 'Barrier', 'Barrera'],
    ['Fácil', 'Easy', 'Fácil'],
    ['Médio', 'Medium', 'Medio'],
    ['Difícil', 'Hard', 'Difícil'],
    ['Livre', 'Free', 'Libre'],
    ['Jogar até:', 'Play to:', 'Jugar hasta:'],
    ['Dificuldade', 'Difficulty', 'Dificultad'],
    ['Dificuldade da CPU:', 'CPU difficulty:', 'Dificultad de la CPU:'],
    ['Dificuldade do campeonato:', 'Championship difficulty:', 'Dificultad del campeonato:'],
    ['4 fases • Dificuldade crescente', '4 stages • Rising difficulty', '4 fases • Dificultad creciente'],
    ['Mover:', 'Move:', 'Mover:'],
    ['Iniciar/Pausar:', 'Start/Pause:', 'Iniciar/Pausar:'],
    ['W / S ou ↑ / ↓', 'W / S or ↑ / ↓', 'W / S o ↑ / ↓'],
    ['barra de espaço (o adversário é sempre a CPU) —', 'space bar (the opponent is always the CPU) —', 'barra espaciadora (el rival siempre es la CPU) —'],
    ['rebata contra a parede.', 'bounce it against the wall.', 'rebótala contra la pared.'],
    ['dispute pontos contra o adversário.', 'compete for points against the opponent.', 'disputa puntos contra el rival.'],
    ['passe a bola pela abertura móvel no meio da quadra.', 'send the ball through the moving gap in the middle of the court.', 'pasa la pelota por la abertura móvil en medio de la cancha.'],
    ['um por jogo, 4 fases cada, dificuldade crescente. Entre com seu nome pra guardar os troféus.', 'one per game, 4 stages each, rising difficulty. Sign in with your name to keep your trophies.', 'uno por juego, 4 fases cada uno, dificultad creciente. Entra con tu nombre para guardar los trofeos.'],
    ['Tênis / Futebol:', 'Tennis / Soccer:', 'Tenis / Fútbol:'],
    ['Paredão:', 'Wall:', 'Pared:'],
    ['Tênis:', 'Tennis:', 'Tenis:'],
    ['Futebol:', 'Soccer:', 'Fútbol:'],
    ['Barreira:', 'Barrier:', 'Barrera:'],
    ['Campeonato:', 'Championship:', 'Campeonato:'],
    ['Sobrevivência:', 'Survival:', 'Supervivencia:'],
    ['Contra o Tempo:', 'Time Attack:', 'Contrarreloj:'],
    ['Treino Infinito:', 'Endless Training:', 'Entrenamiento infinito:'],
    ['Impossível:', 'Impossible:', 'Imposible:'],
    ['Desafio Diário:', 'Daily Challenge:', 'Desafío diario:'],
    ['Sobrevivência', 'Survival', 'Supervivencia'],
    ['Contra o Tempo', 'Time Attack', 'Contrarreloj'],
    ['Treino Infinito', 'Endless Training', 'Entrenamiento infinito'],
    ['Modo Impossível', 'Impossible Mode', 'Modo imposible'],
    ['Desafio Diário', 'Daily Challenge', 'Desafío diario'],
    ['5 vidas, dificuldade cresce a cada ponto seu. Até onde você chega?', '5 lives, difficulty rises with every point you score. How far can you go?', '5 vidas, la dificultad sube con cada punto tuyo. ¿Hasta dónde llegas?'],
    ['60 segundos pra marcar o máximo de pontos possível.', '60 seconds to score as many points as possible.', '60 segundos para anotar el máximo de puntos posible.'],
    ['Sem placar, sem fim — só pra pegar o jeito da raquete.', 'No score, no end — just to get the feel of the paddle.', 'Sin marcador, sin final: solo para tomarle el pulso a la pala.'],
    ['CPU no limite absoluto. Vencer aqui paga bônus de 150 moedas.', 'CPU at its absolute limit. Winning here pays a 150-coin bonus.', 'CPU al límite absoluto. Ganar aquí da un bono de 150 monedas.'],
    ['O mesmo desafio pra todo mundo hoje. Só paga bônus na primeira vez do dia.', 'The same challenge for everyone today. The bonus is paid only the first time each day.', 'El mismo desafío para todos hoy. Solo da bono la primera vez del día.'],
    ['a CPU acelera a cada ponto seu.', 'the CPU speeds up with every point you score.', 'la CPU acelera con cada punto tuyo.'],
    ['60s para marcar o máximo possível.', '60s to score as much as possible.', '60s para anotar lo máximo posible.'],
    ['a bola nunca marca ponto.', 'the ball never scores.', 'la pelota nunca anota.'],
    ['CPU no limite, recompensa maior.', 'CPU at its limit, bigger reward.', 'CPU al límite, mayor recompensa.'],
    ['o mesmo desafio para todos, todo dia.', 'the same challenge for everyone, every day.', 'el mismo desafío para todos, todos los días.'],
    // Tutorial
    ['Tutorial em 4 passos', '4-step tutorial', 'Tutorial en 4 pasos'],
    ['Mova a raquete', 'Move the paddle', 'Mueve la pala'],
    ['Use os botões ▲ e ▼, arraste o dedo na tela ou use W/S e as setas no teclado.', 'Use the ▲ and ▼ buttons, drag your finger on the screen, or use W/S and the arrow keys on a keyboard.', 'Usa los botones ▲ y ▼, arrastra el dedo en la pantalla o usa W/S y las flechas del teclado.'],
    ['Rebata a bola', 'Hit the ball', 'Golpea la pelota'],
    ['Acerte a bola com a raquete para devolvê-la. Quanto mais perto da borda, mais ela ganha ângulo.', 'Hit the ball with your paddle to send it back. The closer to the edge, the sharper the angle.', 'Golpea la pelota con la pala para devolverla. Cuanto más cerca del borde, más ángulo toma.'],
    ['Marque pontos', 'Score points', 'Anota puntos'],
    ['Faça a bola passar pelo adversário. Primeiro a chegar na pontuação definida vence.', 'Get the ball past your opponent. First to reach the target score wins.', 'Haz que la pelota pase al rival. Gana el primero en llegar al puntaje definido.'],
    ['Paredão, Tênis, Futebol e Barreira, além dos Modos Especiais e do Campeonato.', 'Wall, Tennis, Soccer and Barrier, plus the Special Modes and the Championship.', 'Pared, Tenis, Fútbol y Barrera, además de los Modos especiales y el Campeonato.'],
    ['Os 4 jogos clássicos', 'The 4 classic games', 'Los 4 juegos clásicos'],
    ['você contra a parede sólida da direita, que sempre rebate. Só a CPU marca ponto quando você erra — sobreviva até o cronômetro zerar.', 'you against the solid wall on the right, which always bounces back. Only the CPU scores when you miss — survive until the timer runs out.', 'tú contra la pared sólida de la derecha, que siempre rebota. Solo la CPU anota cuando fallas: sobrevive hasta que el cronómetro llegue a cero.'],
    ['quadra cheia, vale ponto pra qualquer lado.', 'full court, points count for either side.', 'cancha completa, vale punto para cualquier lado.'],
    ['só marca gol acertando a faixa central da trave.', 'you only score by hitting the central part of the goal.', 'solo anotas acertando la franja central del arco.'],
    ['passe a bola pela abertura que se move no meio.', 'send the ball through the gap that moves in the middle.', 'pasa la pelota por la abertura que se mueve en el medio.'],
    ['Campeonato e modos especiais', 'Championship and special modes', 'Campeonato y modos especiales'],
    ['Escolha um jogo e uma dificuldade. São 4 fases contra adversários cada vez mais difíceis, com 3 vidas. Vença as 4 para ganhar o troféu.', 'Pick a game and a difficulty. There are 4 stages against ever-tougher opponents, with 3 lives. Win all 4 to earn the trophy.', 'Elige un juego y una dificultad. Son 4 fases contra rivales cada vez más difíciles, con 3 vidas. Gana las 4 para obtener el trofeo.'],
    ['Moedas, nível e loja', 'Coins, level and shop', 'Monedas, nivel y tienda'],
    ['Ganhe moedas vencendo partidas, campeonatos, conquistas e missões diárias, e gaste na Loja. Vitórias também dão XP, que sobe seu nível. Tudo é salvo com o nome que você usa para entrar.', 'Earn coins by winning matches, championships, achievements and daily missions, and spend them in the Shop. Wins also give XP, which raises your level. Everything is saved under the name you sign in with.', 'Gana monedas ganando partidas, campeonatos, logros y misiones diarias, y gástalas en la Tienda. Las victorias también dan XP, que sube tu nivel. Todo se guarda con el nombre con el que entras.'],
    // Créditos
    ['Em 1977, a Philco-Ford lançou o Telejogo — o primeiro videogame doméstico fabricado no Brasil. Bolinha, duas raquetes, e uma TV de tubo. Esse jogo tenta reviver aquela sensação no seu celular, quase 50 anos depois.', 'In 1977, Philco-Ford launched the Telejogo — the first home video game made in Brazil. A ball, two paddles and a tube TV. This game tries to bring that feeling back on your phone, almost 50 years later.', 'En 1977, Philco-Ford lanzó el Telejogo: el primer videojuego doméstico fabricado en Brasil. Una pelotita, dos palas y una TV de tubo. Este juego intenta revivir esa sensación en tu celular, casi 50 años después.'],
    ['Feito com HTML5 Canvas, CSS e JavaScript puro.', 'Made with HTML5 Canvas, CSS and plain JavaScript.', 'Hecho con HTML5 Canvas, CSS y JavaScript puro.'],
    ['Sons: Interface Sounds por', 'Sounds: Interface Sounds by', 'Sonidos: Interface Sounds de'],
    ['(kenney.nl), licença CC0. Música: "Hard Rock" por', '(kenney.nl), CC0 license. Music: "Hard Rock" by', '(kenney.nl), licencia CC0. Música: "Hard Rock" de'],
    ['(Pixabay, licença Pixabay Content License).', '(Pixabay, Pixabay Content License).', '(Pixabay, licencia Pixabay Content License).'],
    // Estatísticas
    ['Estatísticas gerais', 'General statistics', 'Estadísticas generales'],
    ['Partidas', 'Matches', 'Partidas'],
    ['Vitórias', 'Wins', 'Victorias'],
    ['Derrotas', 'Losses', 'Derrotas'],
    ['Taxa vitória', 'Win rate', 'Tasa de victorias'],
    ['Maior seq.', 'Best streak', 'Mejor racha'],
    ['Tempo jogado', 'Time played', 'Tiempo jugado'],
    ['Pontos feitos', 'Points scored', 'Puntos anotados'],
    ['Pontos sofridos', 'Points conceded', 'Puntos recibidos'],
    ['Partidas por modo', 'Matches by mode', 'Partidas por modo'],
    ['Favoritos e recordes', 'Favorites & records', 'Favoritos y récords'],
    ['Modo favorito', 'Favorite mode', 'Modo favorito'],
    ['Melhor pontuação', 'Best score', 'Mejor puntaje'],
    ['Melhor tempo paredão', 'Best wall time', 'Mejor tiempo en pared'],
    ['Troféus', 'Trophies', 'Trofeos'],
    ['Missões de hoje', "Today's missions", 'Misiones de hoy'],
    ['Nível', 'Level', 'Nivel'],
    ['Seu legado', 'Your legacy', 'Tu legado'],
    ['Taxa vitória', 'Win rate', 'Tasa de victorias'],
    ['Marque 20 pontos hoje', 'Score 20 points today', 'Anota 20 puntos hoy'],
    ['Vença 2 partidas hoje', 'Win 2 matches today', 'Gana 2 partidas hoy'],
    ['Jogue 3 modos diferentes hoje', 'Play 3 different modes today', 'Juega 3 modos distintos hoy'],
    ['Vença uma partida sem sofrer ponto', 'Win a match without conceding a point', 'Gana una partida sin recibir puntos'],
    ['Concluída', 'Completed', 'Completada'],
    // Conquistas
    ['Progresso geral', 'Overall progress', 'Progreso general'],
    ['Conquistas desbloqueadas', 'Achievements unlocked', 'Logros desbloqueados'],
    ['Desbloqueadas', 'Unlocked', 'Desbloqueados'],
    ['Bloqueadas', 'Locked', 'Bloqueados'],
    ['Bloqueada', 'Locked', 'Bloqueado'],
    ['Todas', 'All', 'Todos'],
    ['Todos', 'All', 'Todos'],
    ['Completo', 'Complete', 'Completo'],
    ['Conquista desbloqueada!', 'Achievement unlocked!', '¡Logro desbloqueado!'],
    ['Primeira Vitória', 'First Win', 'Primera victoria'],
    ['Vença sua primeira partida', 'Win your first match', 'Gana tu primera partida'],
    ['10 Vitórias', '10 Wins', '10 victorias'],
    ['Vença 10 partidas', 'Win 10 matches', 'Gana 10 partidas'],
    ['50 Vitórias', '50 Wins', '50 victorias'],
    ['Vença 50 partidas', 'Win 50 matches', 'Gana 50 partidas'],
    ['100 Vitórias', '100 Wins', '100 victorias'],
    ['Vença 100 partidas', 'Win 100 matches', 'Gana 100 partidas'],
    ['Campeão do Paredão', 'Wall Champion', 'Campeón de la Pared'],
    ['Vença o campeonato Paredão', 'Win the Wall championship', 'Gana el campeonato de Pared'],
    ['Campeão do Tênis', 'Tennis Champion', 'Campeón del Tenis'],
    ['Vença o campeonato Tênis', 'Win the Tennis championship', 'Gana el campeonato de Tenis'],
    ['Campeão do Futebol', 'Soccer Champion', 'Campeón del Fútbol'],
    ['Vença o campeonato Futebol', 'Win the Soccer championship', 'Gana el campeonato de Fútbol'],
    ['Campeão da Barreira', 'Barrier Champion', 'Campeón de la Barrera'],
    ['Vença o campeonato Barreira', 'Win the Barrier championship', 'Gana el campeonato de Barrera'],
    ['10 Horas Jogadas', '10 Hours Played', '10 horas jugadas'],
    ['Jogue por 10 horas no total', 'Play for 10 hours in total', 'Juega 10 horas en total'],
    ['50 Horas Jogadas', '50 Hours Played', '50 horas jugadas'],
    ['Jogue por 50 horas no total', 'Play for 50 hours in total', 'Juega 50 horas en total'],
    ['Invencível', 'Unbeatable', 'Invencible'],
    ['Vença uma partida sem sofrer nenhum ponto', 'Win a match without conceding any points', 'Gana una partida sin recibir ningún punto'],
    ['Mestre Vintage', 'Vintage Master', 'Maestro Vintage'],
    ['Conquiste os 4 troféus de campeonato', 'Earn all 4 championship trophies', 'Consigue los 4 trofeos de campeonato'],
    ['Nível 10', 'Level 10', 'Nivel 10'],
    ['Alcance o nível 10 de experiência', 'Reach experience level 10', 'Alcanza el nivel 10 de experiencia'],
    ['Nível 25', 'Level 25', 'Nivel 25'],
    ['Alcance o nível 25 de experiência', 'Reach experience level 25', 'Alcanza el nivel 25 de experiencia'],
    ['Sobrevivente', 'Survivor', 'Superviviente'],
    ['Marque 20+ pontos no modo Sobrevivência', 'Score 20+ points in Survival mode', 'Anota más de 20 puntos en el modo Supervivencia'],
    ['Contra o Relógio', 'Against the Clock', 'Contra el reloj'],
    ['Marque 10+ pontos no modo Contra o Tempo', 'Score 10+ points in Time Attack mode', 'Anota más de 10 puntos en el modo Contrarreloj'],
    ['Hábito Diário', 'Daily Habit', 'Hábito diario'],
    ['Complete o Desafio Diário 7 dias seguidos', 'Complete the Daily Challenge 7 days in a row', 'Completa el Desafío diario 7 días seguidos'],
    ['Colecionador', 'Collector', 'Coleccionista'],
    ['Compre pelo menos 1 item de cada categoria da Loja', 'Buy at least 1 item from every Shop category', 'Compra al menos 1 artículo de cada categoría de la Tienda'],
    ['Campeonato Paredão 🧱', 'Wall Championship 🧱', 'Campeonato de Pared 🧱'],
    // Ranking
    ['Pódio · top 3', 'Podium · Top 3', 'Podio · Top 3'],
    ['Top 100 local', 'Local Top 100', 'Top 100 local'],
    ['Ainda não há pontuações registradas.', 'No scores recorded yet.', 'Aún no hay puntajes registrados.'],
    ['Jogue uma partida (logado) para entrar no ranking!', 'Play a match (signed in) to enter the ranking!', '¡Juega una partida (con sesión iniciada) para entrar al ranking!'],
    ['Melhor posição', 'Best rank', 'Mejor posición'],
    ['Jogue para entrar', 'Play to enter', 'Juega para entrar'],
    // Loja
    ['Suas moedas', 'your coins', 'tus monedas'],
    ['Destaque', 'Featured', 'Destacado'],
    ['Equipado', 'Equipped', 'Equipado'],
    ['Bolas', 'Balls', 'Pelotas'],
    ['Raquetes', 'Paddles', 'Palas'],
    ['Ambientes', 'Environments', 'Ambientes'],
    ['Borda Neon', 'Neon Border', 'Borde neón'],
    ['Pisos', 'Floors', 'Pisos'],
    ['Efeitos', 'Effects', 'Efectos'],
    ['Sons', 'Sounds', 'Sonidos'],
    ['Padrão', 'Default', 'Estándar'],
    ['Raro', 'Rare', 'Raro'],
    ['Épico', 'Epic', 'Épico'],
    ['Lendário', 'Legendary', 'Legendario'],
    ['Branco Puro', 'Pure White', 'Blanco puro'],
    ['Ouro Maciço', 'Solid Gold', 'Oro macizo'],
    ['Ouro Real', 'Royal Gold', 'Oro real'],
    ['Azul Elétrico', 'Electric Blue', 'Azul eléctrico'],
    ['Arena Padrão', 'Standard Arena', 'Arena estándar'],
    ['Pôr do Sol', 'Sunset', 'Atardecer'],
    ['Plasma Ciano', 'Cyan Plasma', 'Plasma cian'],
    ['Rosa Neon', 'Neon Pink', 'Rosa neón'],
    ['Verde Radioativo', 'Radioactive Green', 'Verde radiactivo'],
    ['Vermelho Turbo', 'Turbo Red', 'Rojo turbo'],
    ['Ultravioleta', 'Ultraviolet', 'Ultravioleta'],
    ['Gelo Polar', 'Polar Ice', 'Hielo polar'],
    ['Floresta', 'Forest', 'Bosque'],
    ['Galáxia', 'Galaxy', 'Galaxia'],
    ['Vulcão', 'Volcano', 'Volcán'],
    ['Oceano', 'Ocean', 'Océano'],
    ['Lava', 'Lava', 'Lava'],
    ['Ácido', 'Acid', 'Ácido'],
    ['Âmbar', 'Amber', 'Ámbar'],
    ['Pérola', 'Pearl', 'Perla'],
    ['Rosa', 'Pink', 'Rosa'],
    ['Verde', 'Green', 'Verde'],
    ['Ciano', 'Cyan', 'Cian'],
    ['Cromada', 'Chrome', 'Cromada'],
    ['Dourada', 'Golden', 'Dorada'],
    ['Explosivo', 'Explosive', 'Explosivo'],
    ['Discreto', 'Subtle', 'Discreto'],
    ['Clássica', 'Classic', 'Clásica'],
    ['Moedas grátis · assista um anúncio curto e ganhe +30', 'Free coins · watch a short ad and earn +30', 'Monedas gratis · mira un anuncio corto y gana +30'],
    ['Remover anúncios · jogue sem interrupções e apoie o projeto', 'Remove ads · play without interruptions and support the project', 'Quitar anuncios · juega sin interrupciones y apoya el proyecto'],
    ['Assistir (0/5 hoje)', 'Watch (0/5 today)', 'Ver (0/5 hoy)'],
    ['Anúncio (simulado)', 'Ad (simulated)', 'Anuncio (simulado)'],
    ['Vídeo concluído! Recompensa liberada.', 'Video complete! Reward unlocked.', '¡Video completado! Recompensa liberada.'],
    // Fim de partida
    ['Partida finalizada', 'Match over', 'Partida finalizada'],
    ['Vitória', 'Victory', 'Victoria'],
    ['Derrota', 'Defeat', 'Derrota'],
    ['Duração', 'Duration', 'Duración'],
    ['Pontos', 'Points', 'Puntos'],
    ['Você perdeu essa fase', 'You lost this stage', 'Perdiste esta fase'],
    ['Fase concluída!', 'Stage complete!', '¡Fase completada!'],
    ['Próxima fase', 'Next stage', 'Siguiente fase'],
    ['Tentar de novo', 'Try again', 'Intentar de nuevo'],
    ['Jogar de novo', 'Play again', 'Jugar de nuevo'],
    ['Sair do campeonato', 'Leave championship', 'Salir del campeonato'],
    ['Modo livre', 'Free mode', 'Modo libre'],
    ['Suas vidas acabaram!', "You're out of lives!", '¡Se acabaron tus vidas!'],
    ['Fim da Sobrevivência', 'Survival over', 'Fin de la Supervivencia'],
    ['Fim de jogo', 'Game over', 'Fin del juego'],
    ['Compartilhar', 'Share', 'Compartir'],
    ['Quase!', 'So close!', '¡Casi!'],
    ['GOL DA CPU', 'CPU GOAL', 'GOL DE LA CPU'],
    ['Ponto!', 'POINT!', '¡PUNTO!'],
    ['Wander · Nv.1', 'Wander · Lv.1', 'Wander · Nv.1'],
  ];

  const MAP = { en: {}, es: {} };
  ROWS.forEach(([pt, en, es]) => {
    const k = pt.toLowerCase();
    MAP.en[k] = en; MAP.es[k] = es;
  });

  // Textos com números/nomes variáveis: [regex em português, função(lang, match) -> texto]
  const PATTERNS = [
    [/^(\d+) \/ (\d+)$/, null],
    [/^(\d+) jogos?$/i, (L, m) => m[1] + (L === 'en' ? (m[1] === '1' ? ' game' : ' games') : (m[1] === '1' ? ' juego' : ' juegos'))],
    [/^(\d+) partidas? • (\d+)% vitórias$/i, (L, m) => L === 'en' ? `${m[1]} matches • ${m[2]}% wins` : `${m[1]} partidas • ${m[2]}% victorias`],
    [/^(\d+) partidas? · (\d+)\/(\d+) conquistas$/i, (L, m) => L === 'en' ? `${m[1]} MATCHES · ${m[2]}/${m[3]} ACHIEVEMENTS` : `${m[1]} PARTIDAS · ${m[2]}/${m[3]} LOGROS`],
    [/^(\d+)\/(\d+) desbloqueadas$/i, (L, m) => L === 'en' ? `${m[1]}/${m[2]} unlocked` : `${m[1]}/${m[2]} desbloqueados`],
    [/^(\d+)% para o próximo nível · (\d+) xp restantes$/i, (L, m) => L === 'en' ? `${m[1]}% TO NEXT LEVEL · ${m[2]} XP LEFT` : `${m[1]}% AL SIGUIENTE NIVEL · ${m[2]} XP RESTANTES`],
    [/^(\d+) moedas$/i, (L, m) => L === 'en' ? `${m[1]} COINS` : `${m[1]} MONEDAS`],
    [/^(\d+)min$/i, (L, m) => m[1] + 'min'],
    [/^(desbloqueadas|bloqueadas) \((\d+)\)$/i, (L, m) => (L === 'en' ? (/^d/i.test(m[1]) ? 'UNLOCKED' : 'LOCKED') : (/^d/i.test(m[1]) ? 'DESBLOQUEADOS' : 'BLOQUEADOS')) + ` (${m[2]})`],
    [/^concluída · \+(\d+)( .*)?$/i, (L, m) => (L === 'en' ? 'DONE · +' : 'HECHA · +') + m[1] + (m[2] || '')],
    [/^assista até o fim pra (.+)\.\.\. (\d+)s$/i, (L, m) => (L === 'en' ? 'Watch until the end to ' : 'Mira hasta el final para ') + (/ganhar moedas/i.test(m[1]) ? (L === 'en' ? 'earn coins' : 'ganar monedas') : m[1]) + '... ' + m[2] + 's'],
    [/^(.+) — ainda não conquistado$/i, (L, m, t) => t(m[1]) + (L === 'en' ? ' — not yet earned' : ' — aún no conseguido')],
    [/^(.+) — campeão!$/i, (L, m, t) => t(m[1]) + (L === 'en' ? ' — Champion!' : ' — ¡Campeón!')],
    [/^(.+) · \+(\d+) 🪙$/, (L, m, t) => t(m[1]) + ' · +' + m[2] + ' 🪙'],
    [/^(.+) · (\d+) x (\d+)$/i, (L, m, t) => t(m[1]) + ' · ' + m[2] + ' X ' + m[3]],
    [/^(.+) · nv\.(\d+)$/i, (L, m) => m[1] + ' · ' + (L === 'en' ? 'LV.' : 'NV.') + m[2]],
    [/^nv\.(\d+) · (.+)$/i, (L, m) => (L === 'en' ? 'LV.' : 'NV.') + m[1] + ' · ' + m[2]],
    [/^nv\.(\d+)$/i, (L, m) => (L === 'en' ? 'Lv.' : 'Nv.') + m[1]],
    [/^nível (\d+)$/i, (L, m) => (L === 'en' ? 'Level ' : 'Nivel ') + m[1]],
    [/^marque (\d+) pontos hoje$/i, (L, m) => L === 'en' ? `Score ${m[1]} points today` : `Anota ${m[1]} puntos hoy`],
    [/^vença (\d+) partidas? hoje$/i, (L, m) => L === 'en' ? `Win ${m[1]} match${m[1] > 1 ? 'es' : ''} today` : `Gana ${m[1]} partida${m[1] > 1 ? 's' : ''} hoy`],
    [/^jogue (\d+) modos diferentes hoje$/i, (L, m) => L === 'en' ? `Play ${m[1]} different modes today` : `Juega ${m[1]} modos distintos hoy`],
    [/^(\d+) vidas, dificuldade cresce a cada ponto seu\. até onde você chega\?$/i, (L, m) => L === 'en' ? `${m[1]} lives, difficulty rises with every point you score. How far can you go?` : `${m[1]} vidas, la dificultad sube con cada punto tuyo. ¿Hasta dónde llegas?`],
    [/^você venceu por (\d+) x (\d+)$/i, (L, m) => L === 'en' ? `You won ${m[1]} to ${m[2]}` : `Ganaste ${m[1]} a ${m[2]}`],
    [/^você perdeu por (\d+) x (\d+)$/i, (L, m) => L === 'en' ? `You lost ${m[1]} to ${m[2]}` : `Perdiste ${m[1]} a ${m[2]}`],
    [/^você venceu o (.+) por (\d+) a (\d+)\. próximo adversário: (.+)\.$/i, (L, m) => L === 'en' ? `You beat ${m[1]} ${m[2]} to ${m[3]}. Next opponent: ${m[4]}.` : `Venciste a ${m[1]} por ${m[2]} a ${m[3]}. Próximo rival: ${m[4]}.`],
    [/^o (.+) venceu por (\d+) a (\d+)\. vidas restantes: (\d+)\. quer tentar de novo\?$/i, (L, m) => L === 'en' ? `${m[1]} won ${m[2]} to ${m[3]}. Lives left: ${m[4]}. Try again?` : `${m[1]} ganó ${m[2]} a ${m[3]}. Vidas restantes: ${m[4]}. ¿Intentar de nuevo?`],
    [/^você aguentou até marcar (\d+) ponto\(s\) antes de perder todas as vidas!$/i, (L, m) => L === 'en' ? `You lasted until scoring ${m[1]} point(s) before losing all your lives!` : `¡Aguantaste hasta anotar ${m[1]} punto(s) antes de perder todas tus vidas!`],
    [/^você marcou (\d+) ponto\(s\) em (\d+) segundos\.$/i, (L, m) => L === 'en' ? `You scored ${m[1]} point(s) in ${m[2]} seconds.` : `Anotaste ${m[1]} punto(s) en ${m[2]} segundos.`],
    [/^jogador 1 venceu por (\d+) a (\d+)\.$/i, (L, m) => L === 'en' ? `Player 1 won ${m[1]} to ${m[2]}.` : `El jugador 1 ganó ${m[1]} a ${m[2]}.`],
    [/^a cpu venceu por (\d+) a (\d+)\.$/i, (L, m) => L === 'en' ? `The CPU won ${m[1]} to ${m[2]}.` : `La CPU ganó ${m[1]} a ${m[2]}.`],
    [/^(\d+):(\d+) pra sobreviver$/i, (L, m) => L === 'en' ? `${m[1]}:${m[2]} to survive` : `${m[1]}:${m[2]} para sobrevivir`],
    [/^⏱ (\d+:\d+) pra sobreviver$/i, (L, m) => `⏱ ${m[1]} ` + (L === 'en' ? 'to survive' : 'para sobrevivir')],
    [/^(\d+):(\d+) \(sobreviva ao tempo!\)$/i, (L, m) => `${m[1]}:${m[2]} ` + (L === 'en' ? '(survive the clock!)' : '(¡sobrevive al tiempo!)')],
    [/^(\d\d) : (\d\d) \(sobreviva ao tempo!\)$/i, (L, m) => `${m[1]} : ${m[2]} ` + (L === 'en' ? '(survive the clock!)' : '(¡sobrevive al tiempo!)')],
    [/^você$/i, (L) => L === 'en' ? 'YOU' : 'TÚ'],
    [/^cpu · (.+)$/i, (L, m, t) => 'CPU · ' + t(m[1]).toUpperCase()],
    [/^(.+) · (\d+) x (\d+) · (.+)$/i, null],
  ];

  let lang = 'pt';
  const originals = new WeakMap(); // nó de texto -> { orig, out }
  let busy = false;

  function translate(text, L) {
    L = L || lang;
    if (L === 'pt') return text;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    const core = text.trim();
    if (!core) return text;
    const res = translateCore(core, L);
    return res === core ? text : lead + res + trail;
  }

  function matchCase(src, out) {
    const letters = src.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length > 1 && letters === letters.toUpperCase()) return out.toUpperCase();
    return out;
  }

  function translateCore(core, L) {
    const tr = (s) => translateCore(s, L);
    const key = core.replace(/[\s\u00a0]+/g, ' ').toLowerCase();
    if (MAP[L][key] !== undefined) return matchCase(core, MAP[L][key]);
    for (let i = 0; i < PATTERNS.length; i++) {
      const [re, fn] = PATTERNS[i];
      if (!fn) continue;
      const m = core.match(re);
      if (m) return matchCase(core, fn(L, m, tr));
    }
    return core;
  }

  function processNode(node) {
    if (node.nodeType === 3) {
      const p = node.parentNode;
      if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
      const rec = originals.get(node);
      const cur = node.nodeValue;
      if (rec && cur === rec.out) { // ainda é a nossa tradução
        if (lang === 'pt') { node.nodeValue = rec.orig; originals.delete(node); }
        else {
          const out = translate(rec.orig);
          if (out !== cur) { rec.out = out; node.nodeValue = out; }
        }
        return;
      }
      if (lang === 'pt') return;
      const out = translate(cur);
      if (out !== cur) { originals.set(node, { orig: cur, out }); node.nodeValue = out; }
    } else if (node.nodeType === 1) {
      const tag = node.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      ['placeholder', 'aria-label', 'title'].forEach((a) => {
        const v = node.getAttribute && node.getAttribute(a);
        if (!v) return;
        const k = '__i18n_' + a;
        if (node[k] && v === node[k].out) {
          const want = lang === 'pt' ? node[k].orig : translate(node[k].orig);
          if (want !== v) { node.setAttribute(a, want); node[k].out = want; }
          return;
        }
        if (lang === 'pt') return;
        const out = translate(v);
        if (out !== v) { node[k] = { orig: v, out }; node.setAttribute(a, out); }
      });
      node.childNodes.forEach(processNode);
    }
  }

  function processAttrOnly(node, a) {
    if (lang === 'pt') return;
    const v = node.getAttribute(a);
    if (!v) return;
    const out = translate(v);
    if (out !== v) { node['__i18n_' + a] = { orig: v, out }; node.setAttribute(a, out); }
  }

  function run(root) {
    busy = true;
    try { processNode(root || document.body); } finally { busy = false; }
  }

  let observer = null;
  function start() {
    if (observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver((muts) => {
      if (busy) return;
      busy = true;
      try {
        muts.forEach((m) => {
          if (m.type === 'characterData') processNode(m.target);
          else if (m.type === 'attributes') { const x = m.target; const a = m.attributeName; const v = x.getAttribute(a); const k = '__i18n_' + a; if (!(x[k] && v === x[k].out)) { if (x[k]) x[k] = null; processAttrOnly(x, a); } }
          else m.addedNodes.forEach(processNode);
        });
      } finally { busy = false; }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  }

  function setLang(l) {
    lang = (l === 'en' || l === 'es') ? l : 'pt';
    start();
    run(document.body);
  }

  return { setLang, translate, run };
})();
