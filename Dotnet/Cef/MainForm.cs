using System;
using System.Diagnostics.CodeAnalysis;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using NLog;

namespace VRCX
{
    [SuppressMessage("Interoperability", "CA1416:Validate platform compatibility")]
    public partial class MainForm : WinformBase
    {
        public static MainForm Instance;
        public static NativeWindow nativeWindow;
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();
        public ChromiumWebBrowser Browser;
        private readonly Icon _appIcon;
        private readonly Icon _appIconNoty;
        private readonly Timer _saveTimer;
        private int LastLocationX;
        private int LastLocationY;
        private int LastSizeWidth;
        private int LastSizeHeight;
        private FormWindowState LastWindowStateToRestore = FormWindowState.Normal;

        private const int WM_NCHITTEST = 0x0084;
        private const int HTCLIENT = 1;
        private const int HTCAPTION = 2;
        private const int HTLEFT = 10;
        private const int HTRIGHT = 11;
        private const int HTTOP = 12;
        private const int HTTOPLEFT = 13;
        private const int HTTOPRIGHT = 14;
        private const int HTBOTTOM = 15;
        private const int HTBOTTOMLEFT = 16;
        private const int HTBOTTOMRIGHT = 17;
        private const int WM_NCLBUTTONDOWN = 0x00A1;
        private const int RESIZE_BORDER = 8;
        private const int WS_THICKFRAME = 0x00040000;
        private const int WS_MINIMIZEBOX = 0x00020000;
        private const int WS_MAXIMIZEBOX = 0x00010000;
        private const int WS_SYSMENU = 0x00080000;

        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr handle, int message, IntPtr wParam, IntPtr lParam);

        public MainForm()
        {
            Instance = this;
            InitializeComponent();
            nativeWindow = NativeWindow.FromHandle(this.Handle);

            // adding a 5s delay here to avoid excessive writes to disk
            _saveTimer = new Timer();
            _saveTimer.Interval = 5000;
            _saveTimer.Tick += SaveTimer_Tick;
            try
            {
                var path = Path.GetDirectoryName(Environment.ProcessPath) ?? string.Empty;
                _appIcon = new Icon(Path.Combine(path, "BetterVRCX.ico"));
                _appIconNoty = new Icon(Path.Combine(path, "BetterVRCX_notify.ico"));
                Icon = _appIcon;
                TrayIcon.Icon = _appIcon;
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }

            Browser = new ChromiumWebBrowser(Program.LaunchDebug ? "http://localhost:9000/index.html" : "file://vrcx/index.html")
            {
                DragHandler = new CustomDragHandler(),
                MenuHandler = new CustomMenuHandler(),
                DownloadHandler = new CustomDownloadHandler(),
                RequestHandler = new CustomRequestHandler(),
                BrowserSettings =
                {
                    DefaultEncoding = "UTF-8",
                },
                Dock = DockStyle.Fill
            };
            Browser.IsBrowserInitializedChanged += (_, _) =>
            {
                if (Program.LaunchDebug)
                    Browser.ShowDevTools();
            };
            Browser.AddressChanged += (_, addressChangedEventArgs) =>
            {
                logger.Debug("Address changed: " + addressChangedEventArgs.Address);
            };
            Browser.LoadingStateChanged += (_, loadingFailedEventArgs) =>
            {
                if (loadingFailedEventArgs.IsLoading)
                    logger.Debug("Loading page");
                else
                    logger.Debug("Loaded page: " + loadingFailedEventArgs.Browser.MainFrame.Url);
            };
            Browser.ConsoleMessage += (_, consoleMessageEventArgs) =>
            {
                logger.Debug(consoleMessageEventArgs.Message + " (" + consoleMessageEventArgs.Source + ":" + consoleMessageEventArgs.Line + ")");
            };
            Browser.GotFocus += (_, _) =>
            {
                if (Browser != null && !Browser.IsLoading && Browser.CanExecuteJavascriptInMainFrame)
                    Browser.ExecuteScriptAsync("window?.$pinia?.vrcStatus?.onBrowserFocus();");
            };

            JavascriptBindings.ApplyAppJavascriptBindings(Browser.JavascriptObjectRepository);
            Controls.Add(Browser);
        }

        protected override CreateParams CreateParams
        {
            get
            {
                var createParams = base.CreateParams;
                createParams.Style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU;
                return createParams;
            }
        }

        protected override void WndProc(ref Message message)
        {
            if (message.Msg == WM_NCHITTEST && WindowState == FormWindowState.Normal)
            {
                var point = PointToClient(Cursor.Position);
                var resizeHit = GetResizeHitTest(point);
                if (resizeHit != HTCLIENT)
                {
                    message.Result = (IntPtr)resizeHit;
                    return;
                }
            }

            base.WndProc(ref message);
        }

        private int GetResizeHitTest(Point point)
        {
            var left = point.X <= RESIZE_BORDER;
            var right = point.X >= ClientSize.Width - RESIZE_BORDER;
            var top = point.Y <= RESIZE_BORDER;
            var bottom = point.Y >= ClientSize.Height - RESIZE_BORDER;

            if (top && left) return HTTOPLEFT;
            if (top && right) return HTTOPRIGHT;
            if (bottom && left) return HTBOTTOMLEFT;
            if (bottom && right) return HTBOTTOMRIGHT;
            if (left) return HTLEFT;
            if (right) return HTRIGHT;
            if (top) return HTTOP;
            if (bottom) return HTBOTTOM;
            return HTCLIENT;
        }

        public void BeginWindowDrag()
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(BeginWindowDrag));
                return;
            }

            ReleaseCapture();
            SendMessage(Handle, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
        }

        public void MinimizeWindow()
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(MinimizeWindow));
                return;
            }

            WindowState = FormWindowState.Minimized;
        }

        public void ToggleMaximizeWindow()
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(ToggleMaximizeWindow));
                return;
            }

            WindowState = WindowState == FormWindowState.Maximized
                ? FormWindowState.Normal
                : FormWindowState.Maximized;
        }

        public bool IsWindowMaximized()
        {
            if (InvokeRequired)
                return (bool)Invoke(new Func<bool>(IsWindowMaximized));

            return WindowState == FormWindowState.Maximized;
        }

        public void CloseWindow()
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(CloseWindow));
                return;
            }

            Close();
        }

        private void MainForm_Load(object sender, System.EventArgs e)
        {
            try
            {
                int.TryParse(VRCXStorage.Instance.Get("VRCX_LocationX"), out LastLocationX);
                int.TryParse(VRCXStorage.Instance.Get("VRCX_LocationY"), out LastLocationY);
                int.TryParse(VRCXStorage.Instance.Get("VRCX_SizeWidth"), out LastSizeWidth);
                int.TryParse(VRCXStorage.Instance.Get("VRCX_SizeHeight"), out LastSizeHeight);
                var location = new Point(LastLocationX, LastLocationY);
                var size = new Size(LastSizeWidth, LastSizeHeight);
                var screen = Screen.FromPoint(location);
                if (screen.Bounds.Contains(location.X, location.Y))
                {
                    Location = location;
                }
                Size = new Size(1920, 1080);
                if (size.Width > 0 && size.Height > 0)
                {
                    Size = size;
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }

            try
            {
                var state = WindowState;
                var startAsMinimized = VRCXStorage.Instance.Get("VRCX_StartAsMinimizedState") == "true";
                var closeToTray = VRCXStorage.Instance.Get("VRCX_CloseToTray") == "true";
                if (int.TryParse(VRCXStorage.Instance.Get("VRCX_WindowState"), out var value))
                {
                    state = (FormWindowState)value;
                }
                if (state == FormWindowState.Minimized)
                {
                    state = FormWindowState.Normal;
                }
                // Apply WindowState twice to maximize before minimize
                WindowState = state;
                LastWindowStateToRestore = state;

                if (StartupArgs.LaunchArguments.IsStartup && startAsMinimized)
                {
                    if (closeToTray)
                    {
                        BeginInvoke(Hide);
                        return;
                    }
                    state = FormWindowState.Minimized;
                    WindowState = state;
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }

            Browser.Invalidate();
        }

        private void MainForm_Resize(object sender, System.EventArgs e)
        {
            if (WindowState != FormWindowState.Minimized)
                LastWindowStateToRestore = WindowState;

            if (WindowState != FormWindowState.Normal)
                return;

            LastSizeWidth = Size.Width;
            LastSizeHeight = Size.Height;

            _saveTimer?.Start();
        }

        private void SaveTimer_Tick(object sender, EventArgs e)
        {
            SaveWindowState();
            _saveTimer?.Stop();
        }

        private void MainForm_Move(object sender, System.EventArgs e)
        {
            if (WindowState != FormWindowState.Normal)
            {
                return;
            }
            LastLocationX = Location.X;
            LastLocationY = Location.Y;

            _saveTimer?.Start();
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing &&
                "true".Equals(VRCXStorage.Instance.Get("VRCX_CloseToTray")))
            {
                e.Cancel = true;
                Hide();
            }
        }

        private void SaveWindowState()
        {
            VRCXStorage.Instance.Set("VRCX_LocationX", LastLocationX.ToString());
            VRCXStorage.Instance.Set("VRCX_LocationY", LastLocationY.ToString());
            VRCXStorage.Instance.Set("VRCX_SizeWidth", LastSizeWidth.ToString());
            VRCXStorage.Instance.Set("VRCX_SizeHeight", LastSizeHeight.ToString());
            VRCXStorage.Instance.Set("VRCX_WindowState", ((int)LastWindowStateToRestore).ToString());
            VRCXStorage.Instance.Save();
        }

        private void MainForm_FormClosed(object sender, FormClosedEventArgs e)
        {
            SaveWindowState();
        }

        private void TrayIcon_MouseClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                Focus_Window();
            }
        }

        private void TrayMenu_Open_Click(object sender, System.EventArgs e)
        {
            Focus_Window();
        }

        public void Focus_Window()
        {
            Show();
            if (WindowState == FormWindowState.Minimized)
            {
                WindowState = LastWindowStateToRestore;
            }
            // Focus();
            Activate();
        }

        private void TrayMenu_DevTools_Click(object sender, System.EventArgs e)
        {
            Instance.Browser.ShowDevTools();
        }

        private void TrayMenu_ForceCrash_Click(object sender, System.EventArgs e)
        {
            Instance.Browser.LoadUrl("chrome://crash");
        }

        private void TrayMenu_Quit_Click(object sender, System.EventArgs e)
        {
            SaveWindowState();
            Application.Exit();
        }

        public void SetTrayIconNotification(bool notify)
        {
            TrayIcon.Icon = notify ? _appIconNoty : _appIcon;
        }
    }
}
