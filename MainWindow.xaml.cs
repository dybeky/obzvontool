using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace obzvontool
{
    public partial class MainWindow : Window
    {
        private readonly DispatcherTimer _spawnTimer;
        private readonly DispatcherTimer _clockTimer;
        private readonly Random _random = new();

        // Game state
        private int _score;
        private int _hits;
        private int _misses;
        private int _combo;
        private int _maxCombo;
        private bool _isPlaying;
        private bool _isPaused;

        // Difficulty settings
        private double _targetSize = 55;
        private double _targetSizeVariation = 25;
        private int _spawnInterval = 900;
        private int _targetLifetime = 1800;

        // Stats
        private GameStats _stats = new();
        private readonly string _statsPath;

        // Colors
        private readonly Color[] _targetColors =
        {
            Color.FromRgb(154, 154, 237),
            Color.FromRgb(140, 140, 230),
            Color.FromRgb(170, 170, 245),
            Color.FromRgb(130, 130, 220),
        };

        private readonly Color _successColor = Color.FromRgb(230, 224, 149);
        private readonly Color _missColor = Color.FromRgb(248, 113, 113);
        private readonly Color _comboColor = Color.FromRgb(154, 154, 237);

        // Window state for fullscreen
        private WindowState _previousWindowState;
        private double _previousWidth;
        private double _previousHeight;
        private double _previousLeft;
        private double _previousTop;
        private bool _isFullscreen;

        public MainWindow()
        {
            InitializeComponent();

            _spawnTimer = new DispatcherTimer();
            _spawnTimer.Tick += SpawnTimer_Tick;

            _clockTimer = new DispatcherTimer();
            _clockTimer.Interval = TimeSpan.FromSeconds(1);
            _clockTimer.Tick += ClockTimer_Tick;
            _clockTimer.Start();

            _statsPath = System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "ObzvonTool", "stats.json");

            LoadStats();
            UpdateClocks();
        }

        private void ClockTimer_Tick(object? sender, EventArgs e)
        {
            UpdateClocks();
        }

        private void UpdateClocks()
        {
            // Europe time (CET/CEST - Central European Time)
            try
            {
                var europeZone = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
                var europeTime = TimeZoneInfo.ConvertTime(DateTime.UtcNow, europeZone);
                EuropeTimeText.Text = europeTime.ToString("HH:mm:ss");
            }
            catch
            {
                // Fallback: UTC+1
                var europeTime = DateTime.UtcNow.AddHours(1);
                EuropeTimeText.Text = europeTime.ToString("HH:mm:ss");
            }

            // Moscow time (MSK - UTC+3)
            try
            {
                var moscowZone = TimeZoneInfo.FindSystemTimeZoneById("Russian Standard Time");
                var moscowTime = TimeZoneInfo.ConvertTime(DateTime.UtcNow, moscowZone);
                MoscowTimeText.Text = moscowTime.ToString("HH:mm:ss");
            }
            catch
            {
                // Fallback: UTC+3
                var moscowTime = DateTime.UtcNow.AddHours(3);
                MoscowTimeText.Text = moscowTime.ToString("HH:mm:ss");
            }
        }

        private void LoadStats()
        {
            try
            {
                if (File.Exists(_statsPath))
                {
                    var json = File.ReadAllText(_statsPath);
                    _stats = JsonSerializer.Deserialize<GameStats>(json) ?? new GameStats();
                }
            }
            catch { _stats = new GameStats(); }

            UpdateStatsDisplay();
        }

        private void SaveStats()
        {
            try
            {
                var dir = System.IO.Path.GetDirectoryName(_statsPath);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir!);
                var json = JsonSerializer.Serialize(_stats);
                File.WriteAllText(_statsPath, json);
            }
            catch { }
        }

        private void UpdateStatsDisplay()
        {
            HighScoreText.Text = _stats.HighScore.ToString();
        }

        #region Window Chrome

        private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ClickCount == 2)
                ToggleMaximize();
            else
                DragMove();
        }

        private void MinimizeButton_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;

        private void MaximizeButton_Click(object sender, RoutedEventArgs e) => ToggleMaximize();

        private void CloseButton_Click(object sender, RoutedEventArgs e) => Close();

        private void ToggleMaximize()
        {
            if (WindowState == WindowState.Maximized)
                WindowState = WindowState.Normal;
            else
                WindowState = WindowState.Maximized;
        }

        private void Window_StateChanged(object sender, EventArgs e)
        {
            if (WindowState == WindowState.Maximized)
                MaximizeIcon.Data = Geometry.Parse("M0,3 H7 V10 H0 Z M3,0 H10 V7 H7 V3 H3 Z");
            else
                MaximizeIcon.Data = Geometry.Parse("M0,0 H10 V10 H0 Z");
        }

        private void ToggleFullscreen()
        {
            if (_isFullscreen)
            {
                WindowState = _previousWindowState;
                Width = _previousWidth;
                Height = _previousHeight;
                Left = _previousLeft;
                Top = _previousTop;
                _isFullscreen = false;
            }
            else
            {
                _previousWindowState = WindowState;
                _previousWidth = Width;
                _previousHeight = Height;
                _previousLeft = Left;
                _previousTop = Top;

                WindowState = WindowState.Normal;
                Left = 0;
                Top = 0;
                Width = SystemParameters.PrimaryScreenWidth;
                Height = SystemParameters.PrimaryScreenHeight;
                _isFullscreen = true;
            }
        }

        #endregion

        #region Window Events

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            PlayMenuAnimations();
        }

        private void Window_KeyDown(object sender, KeyEventArgs e)
        {
            switch (e.Key)
            {
                case Key.Escape:
                    if (_isPlaying) EndGame();
                    break;

                case Key.Space:
                case Key.Enter:
                    if (!_isPlaying && StartScreen.Visibility == Visibility.Visible) StartGame();
                    break;

                case Key.P:
                    if (_isPlaying) TogglePause();
                    break;

                case Key.F11:
                    ToggleFullscreen();
                    break;
            }
        }

        #endregion

        #region Menu Animations

        private System.Windows.Threading.DispatcherTimer? _backgroundParticleTimer;
        private static readonly SolidColorBrush _particlePurpleBrush;
        private static readonly SolidColorBrush _particleYellowBrush;

        static MainWindow()
        {
            _particlePurpleBrush = new SolidColorBrush(Color.FromRgb(154, 154, 237));
            _particleYellowBrush = new SolidColorBrush(Color.FromRgb(230, 224, 149));
            _particlePurpleBrush.Freeze();
            _particleYellowBrush.Freeze();
        }

        private void PlayMenuAnimations()
        {
            // Staggered fade in
            AnimateFadeIn(HighScorePanel, 200);
            AnimateFadeIn(DifficultyPanel, 350);
            AnimateFadeIn(GithubBtn, 500);
            AnimateFadeIn(HotkeyHints, 650);

            // Floating circles - smooth 60fps GPU-accelerated
            AnimateFloatingCircle(FloatingCircle1, 35, 30, 4);
            AnimateFloatingCircle(FloatingCircle2, -30, -35, 5);
            AnimateFloatingCircle(FloatingCircle3, 25, -20, 3.5);
            AnimateFloatingCircle(FloatingCircle4, -20, 30, 4.5);
            AnimateFloatingCircle(FloatingCircle5, 15, 25, 3);
            AnimateFloatingCircle(FloatingCircle6, -25, -15, 5.5);

            // Gradient orbs animation
            AnimateGradientOrb(GradientOrb1, 60, 50, 6, 0.04, 0.08);
            AnimateGradientOrb(GradientOrb2, -50, -40, 7, 0.03, 0.07);
            AnimateGradientOrb(GradientOrb3, 45, -35, 5, 0.025, 0.06);

            // Start background particle system
            StartBackgroundParticles();
        }

        private void StartBackgroundParticles()
        {
            StopBackgroundParticles();

            _backgroundParticleTimer = new System.Windows.Threading.DispatcherTimer(System.Windows.Threading.DispatcherPriority.Render)
            {
                Interval = TimeSpan.FromMilliseconds(600)
            };
            _backgroundParticleTimer.Tick += (s, e) => SpawnBackgroundParticle();
            _backgroundParticleTimer.Start();

            // Spawn initial particles
            for (int i = 0; i < 10; i++)
            {
                SpawnBackgroundParticle(true);
            }
        }

        private void StopBackgroundParticles()
        {
            _backgroundParticleTimer?.Stop();
            _backgroundParticleTimer = null;
            BackgroundParticles.Children.Clear();
        }

        private void SpawnBackgroundParticle(bool instant = false)
        {
            if (BackgroundParticles.ActualWidth < 1 || BackgroundParticles.ActualHeight < 1) return;

            var size = _random.Next(3, 8);
            var startX = _random.NextDouble() * BackgroundParticles.ActualWidth;
            var startY = _random.NextDouble() * BackgroundParticles.ActualHeight;

            var transform = new TranslateTransform(startX, startY);
            var particle = new Ellipse
            {
                Width = size,
                Height = size,
                Fill = _random.Next(2) == 0 ? _particlePurpleBrush : _particleYellowBrush,
                Opacity = 0,
                RenderTransform = transform,
                CacheMode = new BitmapCache { EnableClearType = false, SnapsToDevicePixels = false }
            };

            BackgroundParticles.Children.Add(particle);

            var durationSec = _random.Next(8, 15);
            var duration = TimeSpan.FromSeconds(durationSec);
            var delay = instant ? TimeSpan.Zero : TimeSpan.FromMilliseconds(_random.Next(0, 300));
            var targetOpacity = _random.NextDouble() * 0.15 + 0.05;

            // GPU-accelerated movement via RenderTransform
            var moveY = new DoubleAnimation(startY, startY - _random.Next(100, 250), duration)
            {
                BeginTime = delay
            };
            var moveX = new DoubleAnimation(startX, startX + _random.Next(-80, 80), duration)
            {
                BeginTime = delay
            };

            // Smooth fade
            var fade = new DoubleAnimationUsingKeyFrames();
            fade.KeyFrames.Add(new LinearDoubleKeyFrame(0, KeyTime.FromTimeSpan(delay)));
            fade.KeyFrames.Add(new LinearDoubleKeyFrame(targetOpacity, KeyTime.FromTimeSpan(delay + TimeSpan.FromSeconds(1.5))));
            fade.KeyFrames.Add(new LinearDoubleKeyFrame(targetOpacity, KeyTime.FromTimeSpan(delay + duration - TimeSpan.FromSeconds(2))));
            fade.KeyFrames.Add(new LinearDoubleKeyFrame(0, KeyTime.FromTimeSpan(delay + duration)));

            fade.Completed += (s, e) => BackgroundParticles.Children.Remove(particle);

            transform.BeginAnimation(TranslateTransform.XProperty, moveX);
            transform.BeginAnimation(TranslateTransform.YProperty, moveY);
            particle.BeginAnimation(OpacityProperty, fade);
        }

        private void AnimateFadeIn(UIElement element, int delayMs)
        {
            var anim = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(400))
            {
                BeginTime = TimeSpan.FromMilliseconds(delayMs),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            element.BeginAnimation(OpacityProperty, anim);
        }

        private void AnimateFloatingCircle(Ellipse circle, double deltaX, double deltaY, double seconds)
        {
            var transform = circle.RenderTransform as TranslateTransform ?? new TranslateTransform();
            circle.RenderTransform = transform;

            var xAnim = new DoubleAnimation(0, deltaX, TimeSpan.FromSeconds(seconds))
            {
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever
            };
            var yAnim = new DoubleAnimation(0, deltaY, TimeSpan.FromSeconds(seconds * 0.85))
            {
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever
            };

            // Max FPS - null means unlimited, uses monitor refresh rate
            Timeline.SetDesiredFrameRate(xAnim, null);
            Timeline.SetDesiredFrameRate(yAnim, null);

            transform.BeginAnimation(TranslateTransform.XProperty, xAnim);
            transform.BeginAnimation(TranslateTransform.YProperty, yAnim);
        }

        private void AnimateGradientOrb(Ellipse orb, double deltaX, double deltaY, double seconds, double minOpacity, double maxOpacity)
        {
            var transform = orb.RenderTransform as TranslateTransform ?? new TranslateTransform();
            orb.RenderTransform = transform;

            var xAnim = new DoubleAnimation(0, deltaX, TimeSpan.FromSeconds(seconds))
            {
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever
            };
            var yAnim = new DoubleAnimation(0, deltaY, TimeSpan.FromSeconds(seconds * 1.2))
            {
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever
            };
            var opacityAnim = new DoubleAnimation(minOpacity, maxOpacity, TimeSpan.FromSeconds(seconds * 0.7))
            {
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever
            };

            // Max FPS
            Timeline.SetDesiredFrameRate(xAnim, null);
            Timeline.SetDesiredFrameRate(yAnim, null);
            Timeline.SetDesiredFrameRate(opacityAnim, null);

            transform.BeginAnimation(TranslateTransform.XProperty, xAnim);
            transform.BeginAnimation(TranslateTransform.YProperty, yAnim);
            orb.BeginAnimation(OpacityProperty, opacityAnim);
        }

        #endregion

        #region Navigation

        private void GithubButton_Click(object sender, RoutedEventArgs e)
        {
            Process.Start(new ProcessStartInfo { FileName = "https://github.com/dybeky", UseShellExecute = true });
        }

        private void BackToMenu_Click(object sender, RoutedEventArgs e)
        {
            ResultScreen.Visibility = Visibility.Collapsed;
            StartScreen.Visibility = Visibility.Visible;

            // Clear animation and reset opacity
            StartScreen.BeginAnimation(OpacityProperty, null);
            StartScreen.Opacity = 1;

            // Reset child elements opacity for fade-in animation
            HighScorePanel.BeginAnimation(OpacityProperty, null);
            DifficultyPanel.BeginAnimation(OpacityProperty, null);
            GithubBtn.BeginAnimation(OpacityProperty, null);
            HotkeyHints.BeginAnimation(OpacityProperty, null);

            HighScorePanel.Opacity = 0;
            DifficultyPanel.Opacity = 0;
            GithubBtn.Opacity = 0;
            HotkeyHints.Opacity = 0;

            // Reset gradient orbs
            GradientOrb1.BeginAnimation(OpacityProperty, null);
            GradientOrb2.BeginAnimation(OpacityProperty, null);
            GradientOrb3.BeginAnimation(OpacityProperty, null);

            PlayMenuAnimations();
        }

        #endregion

        #region Game Logic

        private void StartButton_Click(object sender, RoutedEventArgs e) => StartGame();

        private void StartGame()
        {
            // Apply difficulty
            if (EasyMode.IsChecked == true)
            {
                _targetSize = 85; _targetSizeVariation = 25; _spawnInterval = 650; _targetLifetime = 1400;
            }
            else if (HardMode.IsChecked == true)
            {
                _targetSize = 55; _targetSizeVariation = 20; _spawnInterval = 350; _targetLifetime = 800;
            }
            else
            {
                _targetSize = 70; _targetSizeVariation = 25; _spawnInterval = 480; _targetLifetime = 1100;
            }

            _spawnTimer.Interval = TimeSpan.FromMilliseconds(_spawnInterval);

            _score = 0;
            _hits = 0;
            _misses = 0;
            _combo = 0;
            _maxCombo = 0;
            _isPaused = false;

            UpdateUI();

            GameCanvas.Cursor = Cursors.Cross;

            // Fade out screens
            var fadeOut = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(150));
            fadeOut.Completed += (s, e) =>
            {
                StartScreen.Visibility = Visibility.Collapsed;
                ResultScreen.Visibility = Visibility.Collapsed;

                GameHUD.Visibility = Visibility.Visible;
                var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(150));
                GameHUD.BeginAnimation(OpacityProperty, fadeIn);
            };
            StartScreen.BeginAnimation(OpacityProperty, fadeOut);
            ResultScreen.BeginAnimation(OpacityProperty, fadeOut);

            ClearTargets();
            StopBackgroundParticles();

            _isPlaying = true;
            _spawnTimer.Start();
            SpawnTarget();
        }

        private void TogglePause()
        {
            _isPaused = !_isPaused;
            PauseIndicator.Visibility = _isPaused ? Visibility.Visible : Visibility.Collapsed;

            if (_isPaused)
                _spawnTimer.Stop();
            else
                _spawnTimer.Start();
        }

        private void SpawnTimer_Tick(object? sender, EventArgs e)
        {
            if (_isPlaying && !_isPaused) SpawnTarget();
        }

        private void SpawnTarget()
        {
            if (!_isPlaying || _isPaused) return;

            double canvasWidth = GameCanvas.ActualWidth;
            double canvasHeight = GameCanvas.ActualHeight;
            if (canvasWidth <= 0 || canvasHeight <= 0) return;

            double size = _random.NextDouble() * _targetSizeVariation + _targetSize;
            double margin = 40;
            double x = _random.NextDouble() * (canvasWidth - size - margin * 2) + margin;
            double y = _random.NextDouble() * (canvasHeight - size - margin * 2) + margin;

            var color = _targetColors[_random.Next(_targetColors.Length)];

            // Gradient fill
            var gradient = new RadialGradientBrush
            {
                GradientOrigin = new Point(0.3, 0.3),
                Center = new Point(0.5, 0.5)
            };
            gradient.GradientStops.Add(new GradientStop(Color.FromArgb(255,
                (byte)Math.Min(255, color.R + 40),
                (byte)Math.Min(255, color.G + 40),
                (byte)Math.Min(255, color.B + 20)), 0));
            gradient.GradientStops.Add(new GradientStop(color, 1));

            var target = new Ellipse
            {
                Width = size,
                Height = size,
                Fill = gradient,
                Cursor = Cursors.Cross,
                Tag = DateTime.Now,
                Effect = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 20, Opacity = 0.4, Color = color }
            };

            target.MouseLeftButtonDown += Target_Click;

            Canvas.SetLeft(target, x);
            Canvas.SetTop(target, y);
            GameCanvas.Children.Add(target);

            // Fade in
            target.Opacity = 0;
            var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(80));
            target.BeginAnimation(OpacityProperty, fadeIn);

            // Auto disappear
            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(_targetLifetime) };
            timer.Tick += (s, e) =>
            {
                timer.Stop();
                if (GameCanvas.Children.Contains(target))
                {
                    _combo = 0;
                    UpdateComboDisplay();
                    RemoveTarget(target, false);
                }
            };
            timer.Start();
        }

        private void Target_Click(object sender, MouseButtonEventArgs e)
        {
            if (!_isPlaying || _isPaused) return;
            e.Handled = true;

            var target = (Ellipse)sender;
            var spawnTime = (DateTime)target.Tag;
            var reactionTime = (DateTime.Now - spawnTime).TotalMilliseconds;

            // Base score
            int baseScore = reactionTime < 200 ? 50 : reactionTime < 400 ? 35 : reactionTime < 700 ? 22 : 12;

            // Combo
            _combo++;
            if (_combo > _maxCombo) _maxCombo = _combo;

            // Combo multiplier
            double multiplier = 1 + (_combo - 1) * 0.1;
            int finalScore = (int)(baseScore * multiplier);

            _score += finalScore;
            _hits++;

            SpawnParticles(target);
            ShowScorePopup(target, finalScore, _combo > 1);
            RemoveTarget(target, true);
            UpdateUI();
            UpdateComboDisplay();
        }

        private void GameCanvas_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (!_isPlaying || _isPaused) return;
            if (e.OriginalSource is Ellipse) return;

            _misses++;
            _combo = 0;
            UpdateUI();
            UpdateComboDisplay();

            ShowMissEffect(e.GetPosition(GameCanvas));
        }

        #endregion

        #region Visual Effects

        private void SpawnParticles(Ellipse target)
        {
            var cx = Canvas.GetLeft(target) + target.Width / 2;
            var cy = Canvas.GetTop(target) + target.Height / 2;

            for (int i = 0; i < 8; i++)
            {
                var angle = i * 45 * Math.PI / 180;
                var particle = new Ellipse
                {
                    Width = 6,
                    Height = 6,
                    Fill = new SolidColorBrush(_successColor),
                    Opacity = 0.9
                };

                Canvas.SetLeft(particle, cx - 3);
                Canvas.SetTop(particle, cy - 3);
                GameCanvas.Children.Add(particle);

                var transform = new TranslateTransform();
                particle.RenderTransform = transform;

                var dist = 30 + _random.NextDouble() * 20;
                var duration = TimeSpan.FromMilliseconds(250);

                var xAnim = new DoubleAnimation(0, Math.Cos(angle) * dist, duration);
                var yAnim = new DoubleAnimation(0, Math.Sin(angle) * dist, duration);
                var fadeAnim = new DoubleAnimation(0.9, 0, duration);

                fadeAnim.Completed += (s, e) =>
                {
                    if (GameCanvas.Children.Contains(particle))
                        GameCanvas.Children.Remove(particle);
                };

                transform.BeginAnimation(TranslateTransform.XProperty, xAnim);
                transform.BeginAnimation(TranslateTransform.YProperty, yAnim);
                particle.BeginAnimation(OpacityProperty, fadeAnim);
            }
        }

        private void ShowScorePopup(Ellipse target, int score, bool showCombo)
        {
            var left = Canvas.GetLeft(target) + target.Width / 2;
            var top = Canvas.GetTop(target);

            var text = showCombo ? $"+{score} ({_combo}x)" : $"+{score}";
            var popup = new TextBlock
            {
                Text = text,
                FontSize = showCombo ? 20 : 18,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(showCombo ? _comboColor : _successColor)
            };

            Canvas.SetLeft(popup, left - 25);
            Canvas.SetTop(popup, top);
            GameCanvas.Children.Add(popup);

            var moveAnim = new DoubleAnimation(top, top - 40, TimeSpan.FromMilliseconds(350));
            var fadeAnim = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(350)) { BeginTime = TimeSpan.FromMilliseconds(100) };

            fadeAnim.Completed += (s, e) =>
            {
                if (GameCanvas.Children.Contains(popup))
                    GameCanvas.Children.Remove(popup);
            };

            popup.BeginAnimation(Canvas.TopProperty, moveAnim);
            popup.BeginAnimation(OpacityProperty, fadeAnim);
        }

        private void RemoveTarget(Ellipse target, bool isHit)
        {
            if (!GameCanvas.Children.Contains(target)) return;

            if (isHit)
            {
                target.Fill = new SolidColorBrush(_successColor);
                if (target.Effect is DropShadowEffect effect) effect.Color = _successColor;
            }

            var fadeOut = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(60));
            fadeOut.Completed += (s, e) =>
            {
                if (GameCanvas.Children.Contains(target))
                    GameCanvas.Children.Remove(target);
            };
            target.BeginAnimation(OpacityProperty, fadeOut);
        }

        private void ShowMissEffect(Point position)
        {
            var ring = new Ellipse
            {
                Width = 24,
                Height = 24,
                Stroke = new SolidColorBrush(_missColor),
                StrokeThickness = 2,
                Fill = Brushes.Transparent,
                Opacity = 0.7
            };

            Canvas.SetLeft(ring, position.X - 12);
            Canvas.SetTop(ring, position.Y - 12);
            GameCanvas.Children.Add(ring);

            var scale = new ScaleTransform(0.5, 0.5, 12, 12);
            ring.RenderTransform = scale;

            var scaleAnim = new DoubleAnimation(0.5, 1.5, TimeSpan.FromMilliseconds(180));
            var fadeAnim = new DoubleAnimation(0.7, 0, TimeSpan.FromMilliseconds(180));

            fadeAnim.Completed += (s, e) =>
            {
                if (GameCanvas.Children.Contains(ring))
                    GameCanvas.Children.Remove(ring);
            };

            scale.BeginAnimation(ScaleTransform.ScaleXProperty, scaleAnim);
            scale.BeginAnimation(ScaleTransform.ScaleYProperty, scaleAnim);
            ring.BeginAnimation(OpacityProperty, fadeAnim);
        }

        #endregion

        #region UI Updates

        private void UpdateUI()
        {
            // Animate score change
            var currentScore = int.TryParse(ScoreText.Text, out int s) ? s : 0;
            if (_score != currentScore)
            {
                AnimateValue(ScoreText, currentScore, _score, 150);
            }

            int total = _hits + _misses;
            double acc = total > 0 ? (double)_hits / total * 100 : 100;
            AccuracyText.Text = $"{acc:F0}%";
        }

        private void UpdateComboDisplay()
        {
            ComboText.Text = _combo.ToString();

            if (_combo >= 5)
            {
                ComboText.Foreground = new SolidColorBrush(_comboColor);
                var pulse = new DoubleAnimation(1, 1.2, TimeSpan.FromMilliseconds(100)) { AutoReverse = true };
                ComboText.RenderTransform = new ScaleTransform(1, 1);
                ((ScaleTransform)ComboText.RenderTransform).BeginAnimation(ScaleTransform.ScaleXProperty, pulse);
                ((ScaleTransform)ComboText.RenderTransform).BeginAnimation(ScaleTransform.ScaleYProperty, pulse);
            }
            else
            {
                ComboText.Foreground = new SolidColorBrush(_successColor);
            }
        }

        private void AnimateValue(TextBlock textBlock, int from, int to, int durationMs)
        {
            var steps = 10;
            var stepTime = durationMs / steps;
            var increment = (to - from) / (double)steps;
            var current = (double)from;
            var step = 0;

            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(stepTime) };
            timer.Tick += (s, e) =>
            {
                step++;
                current += increment;
                textBlock.Text = ((int)current).ToString();
                if (step >= steps)
                {
                    timer.Stop();
                    textBlock.Text = to.ToString();
                }
            };
            timer.Start();
        }

        private void EndGame()
        {
            _isPlaying = false;
            _isPaused = false;
            _spawnTimer.Stop();
            PauseIndicator.Visibility = Visibility.Collapsed;

            GameCanvas.Cursor = Cursors.Arrow;
            ClearTargets();

            // Update stats
            _stats.TotalHits += _hits;
            _stats.TotalMisses += _misses;
            _stats.GamesPlayed++;
            bool isNewHighScore = _score > _stats.HighScore;
            if (isNewHighScore) _stats.HighScore = _score;
            SaveStats();
            UpdateStatsDisplay();

            // Fade out HUD
            var hudFade = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(100));
            hudFade.Completed += (s, e) => GameHUD.Visibility = Visibility.Collapsed;
            GameHUD.BeginAnimation(OpacityProperty, hudFade);

            // Set results
            int total = _hits + _misses;
            double acc = total > 0 ? (double)_hits / total * 100 : 100;

            FinalScoreText.Text = _score.ToString();
            HitsText.Text = _hits.ToString();
            MissesText.Text = _misses.ToString();
            FinalAccuracyText.Text = $"{acc:F0}%";
            MaxComboText.Text = _maxCombo.ToString();

            NewHighScoreBadge.Visibility = isNewHighScore ? Visibility.Visible : Visibility.Collapsed;

            // Show results
            ResultScreen.Visibility = Visibility.Visible;
            ResultScreen.Opacity = 0;

            var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(250))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            ResultScreen.BeginAnimation(OpacityProperty, fadeIn);

            // Score pop animation
            var pop = new DoubleAnimation(0.7, 1, TimeSpan.FromMilliseconds(400))
            {
                EasingFunction = new ElasticEase { EasingMode = EasingMode.EaseOut, Oscillations = 1, Springiness = 8 }
            };
            ScoreScale.BeginAnimation(ScaleTransform.ScaleXProperty, pop);
            ScoreScale.BeginAnimation(ScaleTransform.ScaleYProperty, pop);
        }

        private void ClearTargets()
        {
            for (int i = GameCanvas.Children.Count - 1; i >= 0; i--)
            {
                var child = GameCanvas.Children[i];
                if (child is Ellipse e && e != FloatingCircle1 && e != FloatingCircle2)
                    GameCanvas.Children.RemoveAt(i);
                else if (child is TextBlock tb && tb.Text.StartsWith("+"))
                    GameCanvas.Children.RemoveAt(i);
            }
        }

        #endregion
    }

    public class GameStats
    {
        public int HighScore { get; set; }
        public int TotalHits { get; set; }
        public int TotalMisses { get; set; }
        public int GamesPlayed { get; set; }
    }
}
