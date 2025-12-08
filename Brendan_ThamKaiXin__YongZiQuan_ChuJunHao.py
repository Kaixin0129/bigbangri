import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
from datetime import datetime
import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")

PINK_MAIN = "#ffc0cb"
BLUE_MAIN = "#8ec5fc"
PINK_LIGHT = "#ffe4f0"
BLUE_LIGHT = "#d6ecff"
WHITE_BG = "#ffffff"
BLACK = "#000000"


def ensure_data_file():
    if not os.path.exists(DATA_FILE):
        data = {"users": [], "profiles": {}}
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)


def load_data():
    ensure_data_file()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "users" not in data:
        data["users"] = []
    if "profiles" not in data:
        data["profiles"] = {}
    save_data(data)
    return data


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


class HoverMenu(tk.Menu):
    def __init__(self, parent, app):
        tk.Menu.__init__(self, parent, tearoff=0)
        self.app = app
        self.add_command(label="Log Out", command=self.logout)
        self.add_separator()
        self.add_command(label="Exit System (Delete All Data)", command=self.exit_system)

    def logout(self):
        if messagebox.askyesno("Log Out", "Do you want to log out?"):
            self.app.current_user = None
            self.app.show_auth_page()

    def exit_system(self):
        if messagebox.askyesno("Exit System", "This will delete all saved data. Are you sure?"):
            if os.path.exists(DATA_FILE):
                os.remove(DATA_FILE)
            self.app.root.quit()


class CareerAssistantApp:
    def __init__(self):
        self.data = load_data()
        self.current_user = None
        self.hover_menu = None

        self.root = tk.Tk()
        self.root.title("Career & Skills Development Assistant")
        self.root.geometry("900x650")
        self.root.configure(bg=PINK_LIGHT)

        self.content_frame = None
        self.nav_buttons = {}
        self.user_label = None

        self.show_auth_page()

    def clear_root(self):
        for w in self.root.winfo_children():
            w.destroy()

    def ensure_profile(self, username):
        if "profiles" not in self.data:
            self.data["profiles"] = {}
        if username not in self.data["profiles"]:
            self.data["profiles"][username] = {
                "career_goals": [],  # 职业目标
                "skills_log": [],    # 技能记录
                "daily_tasks": [],   # 日常任务
                "achievements": [],  # 成就总结
                "interview_qas": []  # 面试问答
            }
            save_data(self.data)

    def show_auth_page(self):
        self.current_user = None
        self.clear_root()
        self.root.configure(bg=PINK_LIGHT)

        outer = tk.Frame(self.root, bg=PINK_LIGHT)
        outer.pack(fill="both", expand=True)

        title_frame = tk.Frame(outer, bg=BLUE_LIGHT, bd=2, relief="solid", highlightbackground=BLACK, highlightcolor=BLACK)
        title_frame.pack(pady=40, padx=40, fill="x")

        title_label = tk.Label(
            title_frame,
            text="💼 Career & Skills Development Assistant",
            font=("Arial", 20, "bold"),
            bg=BLUE_LIGHT,
            fg=BLACK
        )
        title_label.pack(pady=15)

        form_frame = tk.Frame(outer, bg=WHITE_BG, bd=2, relief="solid", highlightbackground=BLACK, highlightcolor=BLACK)
        form_frame.pack(pady=20, padx=60, fill="x")

        auth_mode = tk.StringVar(value="login")

        switch_frame = tk.Frame(form_frame, bg=WHITE_BG)
        switch_frame.pack(pady=10)

        def set_mode(mode):
            auth_mode.set(mode)
            mode_label.config(text="Sign Up" if mode == "signup" else "Log In")
            error_label.config(text="")

        btn_signup = tk.Button(
            switch_frame,
            text="Sign Up",
            bg=PINK_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=lambda: set_mode("signup")
        )
        btn_signup.pack(side="left", padx=10, ipadx=10, ipady=5)

        btn_login = tk.Button(
            switch_frame,
            text="Log In",
            bg=BLUE_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=lambda: set_mode("login")
        )
        btn_login.pack(side="left", padx=10, ipadx=10, ipady=5)

        mode_label = tk.Label(
            form_frame,
            text="Log In",
            font=("Arial", 16, "bold"),
            bg=WHITE_BG,
            fg=BLACK
        )
        mode_label.pack(pady=(10, 5))

        tk.Label(form_frame, text="Username:", font=("Arial", 12), bg=WHITE_BG, fg=BLACK).pack(pady=(10, 2))
        username_entry = tk.Entry(form_frame, font=("Arial", 12), bd=2, relief="solid")
        username_entry.pack(pady=(0, 5), ipadx=5, ipady=3)

        tk.Label(form_frame, text="Password:", font=("Arial", 12), bg=WHITE_BG, fg=BLACK).pack(pady=(10, 2))
        password_entry = tk.Entry(form_frame, font=("Arial", 12), show="*", bd=2, relief="solid")
        password_entry.pack(pady=(0, 5), ipadx=5, ipady=3)

        error_label = tk.Label(form_frame, text="", font=("Arial", 10), bg=WHITE_BG, fg="red")
        error_label.pack(pady=5)

        def handle_submit():
            username = username_entry.get().strip()
            password = password_entry.get().strip()
            if not username or not password:
                error_label.config(text="Please enter username and password")
                return

            if auth_mode.get() == "signup":
                for u in self.data.get("users", []):
                    if u["username"] == username:
                        error_label.config(text="Username already exists")
                        return
                self.data["users"].append({"username": username, "password": password})
                self.ensure_profile(username)
                save_data(self.data)
                messagebox.showinfo("Sign Up", "Account created successfully. You are now logged in.")
                self.current_user = username
                self.show_main_page()
            else:
                for u in self.data.get("users", []):
                    if u["username"] == username and u["password"] == password:
                        self.ensure_profile(username)
                        self.current_user = username
                        self.show_main_page()
                        return
                error_label.config(text="Invalid username or password")

        submit_button = tk.Button(
            form_frame,
            text="Continue",
            font=("Arial", 12, "bold"),
            bg=PINK_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=handle_submit
        )
        submit_button.pack(pady=20, ipadx=20, ipady=5)

    def show_main_page(self):
        self.clear_root()
        self.root.configure(bg=WHITE_BG)

        # 创建主框架，使用grid布局
        main_container = tk.Frame(self.root, bg=WHITE_BG)
        main_container.pack(fill="both", expand=True)
        
        # 配置grid权重
        main_container.grid_rowconfigure(0, weight=0)  # 标题行
        main_container.grid_rowconfigure(1, weight=1)  # 内容行
        main_container.grid_rowconfigure(2, weight=0)  # 导航栏行
        main_container.grid_columnconfigure(0, weight=1)

        # 标题栏
        header = tk.Frame(main_container, bg=BLUE_LIGHT, bd=2, relief="solid", highlightbackground=BLACK, highlightcolor=BLACK)
        header.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)

        title = tk.Label(
            header,
            text="💼 Career & Skills Development Assistant",
            font=("Arial", 18, "bold"),
            bg=BLUE_LIGHT,
            fg=BLACK
        )
        title.pack(side="left", padx=10, pady=10)

        # 用户标签，带悬停菜单
        self.user_label = tk.Label(
            header,
            text=f"👤 User: {self.current_user}",
            font=("Arial", 12),
            bg=BLUE_LIGHT,
            fg=BLACK,
            cursor="hand2"
        )
        self.user_label.pack(side="right", padx=10)
        
        # 创建悬停菜单
        self.hover_menu = HoverMenu(self.root, self)
        
        # 绑定鼠标事件
        self.user_label.bind("<Enter>", self.show_user_menu)
        self.user_label.bind("<Leave>", self.hide_user_menu)

        # 创建内容框架
        self.content_frame = tk.Frame(main_container, bg=WHITE_BG, bd=2, relief="solid", highlightbackground=BLACK, highlightcolor=BLACK)
        self.content_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 5))

        # 创建导航栏
        nav = tk.Frame(main_container, bg=PINK_LIGHT, bd=2, relief="solid", highlightbackground=BLACK, highlightcolor=BLACK, height=60)
        nav.grid(row=2, column=0, sticky="nsew", padx=10, pady=(0, 10))

        self.nav_buttons = {}

        def make_nav_button(text, key, command, default_bg):
            btn = tk.Button(
                nav,
                text=text,
                font=("Arial", 11, "bold"),
                bg=default_bg,
                fg=BLACK,
                bd=2,
                relief="solid",
                highlightbackground=BLACK,
                highlightcolor=BLACK,
                command=lambda k=key, c=command: self.switch_page(k, c)
            )
            btn.pack(side="left", expand=True, fill="both", padx=5, pady=5)
            self.nav_buttons[key] = btn

        # 根据四个主题创建导航按钮
        make_nav_button("🎯 Goal Tracker", "goals", self.show_goals_page, BLUE_MAIN)
        make_nav_button("📚 Skills Log", "skills", self.show_skills_page, WHITE_BG)
        make_nav_button("📅 Daily Task Planner", "tasks", self.show_tasks_page, WHITE_BG)
        make_nav_button("🏆 Achievement Summary", "achievements", self.show_achievements_page, WHITE_BG)

        # 默认显示Goals页面
        self.switch_page("goals", self.show_goals_page)

    def show_user_menu(self, event=None):
        try:
            self.hover_menu.tk_popup(self.user_label.winfo_rootx(), 
                                     self.user_label.winfo_rooty() + self.user_label.winfo_height())
        finally:
            self.hover_menu.grab_release()

    def hide_user_menu(self, event=None):
        pass  # 菜单会自动关闭

    def switch_page(self, key, command):
        # 重置所有按钮颜色为白色
        for k, btn in self.nav_buttons.items():
            btn.config(bg=WHITE_BG)
        
        # 设置当前选中按钮的颜色为蓝色
        self.nav_buttons[key].config(bg=BLUE_MAIN)  # 所有选中按钮都改为蓝色
        
        # 清空内容区域并显示新页面
        for w in self.content_frame.winfo_children():
            w.destroy()
        command()

    def get_profile(self):
        return self.data["profiles"][self.current_user]

    def show_goals_page(self):
        """Goal Tracker: Set short-term and long-term career goals."""
        profile = self.get_profile()
        goals = profile["career_goals"]

        top = tk.Frame(self.content_frame, bg=WHITE_BG)
        top.pack(fill="x", pady=10)

        title = tk.Label(
            top,
            text="🎯 Career Goal Tracker",
            font=("Arial", 16, "bold"),
            bg=WHITE_BG,
            fg=BLACK
        )
        title.pack(anchor="w", padx=10, pady=5)

        sep = ttk.Separator(self.content_frame, orient="horizontal")
        sep.pack(fill="x", padx=10, pady=5)

        form_frame = tk.Frame(self.content_frame, bg=WHITE_BG)
        form_frame.pack(fill="x", padx=10, pady=5)

        # 设置缩短的输入框宽度
        full_width = 20  # 缩短主要输入框长度
        half_width = 10  # Type和Priority用更短的长度
        
        # 配置网格列权重
        form_frame.grid_columnconfigure(1, weight=1)
        form_frame.grid_columnconfigure(3, weight=1)

        # Goal Title (第0行)
        tk.Label(form_frame, text="Goal Title:", font=("Arial", 11), 
                bg=WHITE_BG, fg=BLACK, anchor="e").grid(row=0, column=0, 
                sticky="e", padx=5, pady=3)
        title_entry = tk.Entry(form_frame, font=("Arial", 11), 
                              bd=2, relief="solid", width=full_width)
        title_entry.grid(row=0, column=1, columnspan=3, sticky="we", padx=5, pady=3)

        # Target Date (第1行)
        tk.Label(form_frame, text="Target Date:", font=("Arial", 11), 
                bg=WHITE_BG, fg=BLACK, anchor="e").grid(row=1, column=0, 
                sticky="e", padx=5, pady=3)
        date_frame = tk.Frame(form_frame, bg=WHITE_BG)
        date_frame.grid(row=1, column=1, columnspan=3, sticky="we", padx=5, pady=3)
        
        tk.Label(date_frame, text="(YYYY-MM-DD)", font=("Arial", 9), 
                bg=WHITE_BG, fg="gray", anchor="w").pack(side="left")
        date_entry = tk.Entry(date_frame, font=("Arial", 11), 
                             bd=2, relief="solid", width=full_width-8)
        date_entry.pack(side="left", padx=(5, 0), fill="x", expand=True)

        # Description (第2行)
        tk.Label(form_frame, text="Description:", font=("Arial", 11), 
                bg=WHITE_BG, fg=BLACK, anchor="ne").grid(row=2, column=0, 
                sticky="ne", padx=5, pady=3)
        desc_text = tk.Text(form_frame, font=("Arial", 10), 
                           height=3, width=full_width, bd=2, relief="solid")
        desc_text.grid(row=2, column=1, columnspan=3, sticky="we", padx=5, pady=3)

        # Type和Priority在同一行 (第3行)
        type_frame = tk.Frame(form_frame, bg=WHITE_BG)
        type_frame.grid(row=3, column=0, columnspan=2, sticky="we", padx=5, pady=3)
        
        tk.Label(type_frame, text="Type:", font=("Arial", 11), 
                bg=WHITE_BG, fg=BLACK, anchor="e").pack(side="left", padx=(0, 5))
        type_var = tk.StringVar(value="Short-term")
        type_combo = ttk.Combobox(type_frame, textvariable=type_var, 
                                  values=["Short-term", "Long-term"], 
                                  state="readonly", width=half_width)
        type_combo.pack(side="left", fill="x", expand=True)

        priority_frame = tk.Frame(form_frame, bg=WHITE_BG)
        priority_frame.grid(row=3, column=2, sticky="we", padx=5, pady=3)
        
        tk.Label(priority_frame, text="Priority:", font=("Arial", 11), 
                bg=WHITE_BG, fg=BLACK, anchor="e").pack(side="left", padx=(0, 5))
        priority_var = tk.StringVar(value="High")
        priority_combo = ttk.Combobox(priority_frame, textvariable=priority_var, 
                                      values=["High", "Low"],
                                      state="readonly", width=half_width)
        priority_combo.pack(side="left", fill="x", expand=True)

        # Add Goal按钮 (第3行，在Priority后面)
        def add_goal():
            title_text = title_entry.get().strip()
            goal_type = type_var.get()
            target_date = date_entry.get().strip()
            description = desc_text.get("1.0", "end").strip()
            priority = priority_var.get()

            if not title_text or not target_date:
                messagebox.showerror("Error", "Please fill in title and target date")
                return

            try:
                datetime.strptime(target_date, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror("Error", "Invalid date format")
                return

            new_id = (max([g["id"] for g in goals]) + 1) if goals else 1
            goals.append({
                "id": new_id,
                "title": title_text,
                "type": goal_type,
                "target_date": target_date,
                "description": description,
                "priority": priority,
                "status": "Active",
                "created_date": datetime.now().strftime("%Y-%m-%d")
            })
            save_data(self.data)
            refresh_goals()
            title_entry.delete(0, "end")
            date_entry.delete(0, "end")
            desc_text.delete("1.0", "end")

        add_btn = tk.Button(
            form_frame,
            text="Add Goal",
            font=("Arial", 11, "bold"),
            bg=PINK_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=add_goal
        )
        add_btn.grid(row=3, column=3, sticky="we", padx=5, pady=3)

        list_frame = tk.Frame(self.content_frame, bg=WHITE_BG)
        list_frame.pack(fill="both", expand=True, padx=10, pady=5)

        tk.Label(list_frame, text="My Career Goals:", font=("Arial", 12, "bold"), 
                bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(5, 2))

        # 创建列表框 - 扩大宽度间距
        goals_list = tk.Listbox(
            list_frame, 
            font=("Arial", 11),  # 增大字体
            bd=2, 
            relief="solid",
            selectbackground="#4a86e8",
            selectforeground=WHITE_BG,
            highlightthickness=0,
            selectmode="single",
            activestyle="none"
        )
        goals_list.pack(fill="both", expand=True, side="left", padx=(0, 5), pady=5)

        scrollbar = tk.Scrollbar(list_frame, orient="vertical", command=goals_list.yview)
        scrollbar.pack(side="left", fill="y")
        goals_list.config(yscrollcommand=scrollbar.set)

        control_frame = tk.Frame(list_frame, bg=WHITE_BG)
        control_frame.pack(side="left", fill="y", padx=5, pady=5)

        # 跟踪当前选中的项目
        current_selection = None
        
        def on_goal_select(event):
            nonlocal current_selection
            selection = goals_list.curselection()
            if selection:
                if current_selection == selection[0]:
                    # 如果点击的是已选中的项目，取消选中
                    goals_list.selection_clear(selection[0])
                    current_selection = None
                else:
                    current_selection = selection[0]
        
        # 绑定选择事件
        goals_list.bind('<<ListboxSelect>>', on_goal_select)

        def refresh_goals():
            nonlocal current_selection
            goals_list.delete(0, "end")
            for g in sorted(goals, key=lambda x: (x["priority"], x["target_date"])):
                # 扩大每个字段的宽度，使用格式化字符串控制间距
                priority_symbol = "🔴" if g["priority"] == "High" else "🟡"
                status_symbol = "✓" if g["status"] == "Completed" else ""
                # 扩大列间距：每个字段使用更大的宽度
                type_str = f"{g['type'][:15]:15}"  # 扩大Type宽度
                date_str = f"{g['target_date']:12}"  # 扩大日期宽度
                title_str = f"{g['title'][:40]:40}"  # 扩大标题宽度
                line = f"{priority_symbol} {status_symbol} {type_str} {date_str} {title_str}"
                goals_list.insert("end", line)
            current_selection = None

        def toggle_mark():
            selection = goals_list.curselection()
            if not selection:
                messagebox.showwarning("Warning", "Please select a goal")
                return
            
            selected_index = selection[0]
            # 直接使用索引来查找目标
            if selected_index < len(goals):
                # 获取排序后的目标列表
                sorted_goals = sorted(goals, key=lambda x: (x["priority"], x["target_date"]))
                selected_goal = sorted_goals[selected_index]
                
                # 找到原始列表中的目标并更新状态
                for g in goals:
                    if g['id'] == selected_goal['id']:
                        g['status'] = "Completed" if g['status'] == "Active" else "Active"
                        save_data(self.data)
                        refresh_goals()
                        return

        def delete_goal():
            selection = goals_list.curselection()
            if not selection:
                messagebox.showwarning("Warning", "Please select a goal")
                return
            
            if not messagebox.askyesno("Delete Goal", "Are you sure you want to delete this goal?"):
                return
            
            selected_index = selection[0]
            # 直接使用索引来删除目标
            if selected_index < len(goals):
                # 获取排序后的目标列表
                sorted_goals = sorted(goals, key=lambda x: (x["priority"], x["target_date"]))
                selected_goal = sorted_goals[selected_index]
                
                # 找到原始列表中的目标并删除
                for i, g in enumerate(goals):
                    if g['id'] == selected_goal['id']:
                        del goals[i]
                        save_data(self.data)
                        refresh_goals()
                        return

        # 修改按钮文本为Mark ✓
        mark_btn = tk.Button(
            control_frame,
            text="Mark ✓",
            font=("Arial", 11),
            bg=BLUE_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=toggle_mark
        )
        mark_btn.pack(anchor="w", pady=3, fill="x")

        delete_btn = tk.Button(
            control_frame,
            text="Delete",
            font=("Arial", 11),
            bg=WHITE_BG,
            fg="red",
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=delete_goal
        )
        delete_btn.pack(anchor="w", pady=3, fill="x")

        refresh_goals()

    def show_skills_page(self):
        """Skills Log: Record completed courses, certifications, and new skills."""
        profile = self.get_profile()
        skills = profile["skills_log"]

        # 创建主容器
        main_frame = tk.Frame(self.content_frame, bg=WHITE_BG)
        main_frame.pack(fill="both", expand=True)
        
        # 标题部分
        top = tk.Frame(main_frame, bg=WHITE_BG)
        top.pack(fill="x", pady=10)

        title = tk.Label(
            top,
            text="📚 Skills & Certifications Log",
            font=("Arial", 16, "bold"),
            bg=WHITE_BG,
            fg=BLACK
        )
        title.pack(anchor="w", padx=10, pady=5)

        sep = ttk.Separator(main_frame, orient="horizontal")
        sep.pack(fill="x", padx=10, pady=5)

        # 表单部分 - 使用Frame包装
        form_container = tk.Frame(main_frame, bg=WHITE_BG)
        form_container.pack(fill="x", padx=10, pady=5)
        
        form_frame = tk.Frame(form_container, bg=WHITE_BG)
        form_frame.pack(fill="x")

        # 配置表单网格
        form_frame.grid_columnconfigure(1, weight=1)
        form_frame.grid_columnconfigure(2, minsize=100)

        # Skill/Course Name
        tk.Label(form_frame, text="Skill/Course Name:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=0, column=0, sticky="w", padx=5, pady=2)
        name_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=40)
        name_entry.grid(row=0, column=1, sticky="we", padx=5, pady=2)

        # Type - 增大宽度
        tk.Label(form_frame, text="Type:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=1, column=0, sticky="w", padx=5, pady=2)
        type_var = tk.StringVar(value="Course")
        # 增大Type下拉框的宽度
        type_combo = ttk.Combobox(form_frame, textvariable=type_var, 
                                 values=["Course", "Certification", "Workshop", "Skill", "Project"], 
                                 state="readonly", width=38)  # 增加宽度
        type_combo.grid(row=1, column=1, sticky="we", padx=5, pady=2)

        # Completion Date
        tk.Label(form_frame, text="Completion Date:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=2, column=0, sticky="w", padx=5, pady=2)
        tk.Label(form_frame, text="(YYYY-MM-DD)", font=("Arial", 9), bg=WHITE_BG, fg="gray").grid(row=2, column=1, sticky="w", padx=5, pady=2)
        date_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=40)
        date_entry.grid(row=3, column=1, sticky="we", padx=5, pady=2)
        date_entry.insert(0, datetime.now().strftime("%Y-%m-%d"))

        # Provider/Platform - 新增加
        tk.Label(form_frame, text="Provider/Platform:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=4, column=0, sticky="w", padx=5, pady=2)
        provider_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=40)
        provider_entry.grid(row=4, column=1, sticky="we", padx=5, pady=2)

        # Description/Notes
        tk.Label(form_frame, text="Description/Notes:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=5, column=0, sticky="nw", padx=5, pady=2)
        desc_text = tk.Text(form_frame, font=("Arial", 10), height=3, width=40, bd=2, relief="solid")
        desc_text.grid(row=5, column=1, sticky="we", padx=5, pady=2)

        def add_skill():
            name = name_entry.get().strip()
            skill_type = type_var.get()
            completion_date = date_entry.get().strip()
            provider = provider_entry.get().strip()
            description = desc_text.get("1.0", "end").strip()

            if not name or not completion_date:
                messagebox.showerror("Error", "Please fill in name and completion date")
                return

            try:
                datetime.strptime(completion_date, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror("Error", "Invalid date format")
                return

            new_id = (max([s["id"] for s in skills]) + 1) if skills else 1
            skills.append({
                "id": new_id,
                "name": name,
                "type": skill_type,
                "completion_date": completion_date,
                "provider": provider,  # 保存provider信息
                "description": description,
                "added_date": datetime.now().strftime("%Y-%m-%d")
            })
            save_data(self.data)
            refresh_skills()
            name_entry.delete(0, "end")
            provider_entry.delete(0, "end")
            desc_text.delete("1.0", "end")

        add_btn = tk.Button(
            form_frame,
            text="Add Skill",
            font=("Arial", 11, "bold"),
            bg=BLUE_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=add_skill
        )
        add_btn.grid(row=5, column=2, sticky="ns", padx=10, pady=2)

        # 列表部分
        list_frame = tk.Frame(main_frame, bg=WHITE_BG)
        list_frame.pack(fill="both", expand=True, padx=10, pady=5)

        tk.Label(list_frame, text="My Skills & Certifications:", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(5, 2))

        skills_list = tk.Listbox(
            list_frame, 
            font=("Arial", 11),
            bd=2, 
            relief="solid",
            selectbackground=BLUE_LIGHT,
            selectforeground=BLACK,
            highlightthickness=0,
            selectmode="single",
            activestyle="none"
        )
        skills_list.pack(fill="both", expand=True, side="left", padx=(0, 5), pady=5)

        scrollbar = tk.Scrollbar(list_frame, orient="vertical", command=skills_list.yview)
        scrollbar.pack(side="left", fill="y")
        skills_list.config(yscrollcommand=scrollbar.set)

        control_frame = tk.Frame(list_frame, bg=WHITE_BG)
        control_frame.pack(side="left", fill="y", padx=5, pady=5)

        def refresh_skills():
            skills_list.delete(0, "end")
            for s in sorted(skills, key=lambda x: x["completion_date"], reverse=True):
                type_symbol = "📚" if s["type"] == "Course" else "🏆" if s["type"] == "Certification" else "🛠️" if s["type"] == "Skill" else "💼" if s["type"] == "Project" else "🎓"
                # 扩大Type字段宽度并添加Provider信息
                type_str = f"{s['type'][:20]:20}"  # 扩大Type宽度
                date_str = f"{s['completion_date']:12}"
                name_str = f"{s['name'][:30]:30}"
                provider_str = f"{s.get('provider', '')[:15]:15}"  # 添加Provider信息
                line = f"{type_symbol} {date_str} {type_str} {name_str} {provider_str}"
                skills_list.insert("end", line)

        def delete_skill():
            selection = skills_list.curselection()
            if not selection:
                messagebox.showwarning("Warning", "Please select a skill record")
                return
            
            if not messagebox.askyesno("Delete Record", "Are you sure you want to delete this record?"):
                return
                
            selected_text = skills_list.get(selection[0])
            # 查找并删除对应的记录
            for i, s in enumerate(skills):
                if s['name'] in selected_text and s['completion_date'] in selected_text:
                    del skills[i]
                    save_data(self.data)
                    refresh_skills()
                    return

        delete_btn = tk.Button(
            control_frame,
            text="Delete Record",
            font=("Arial", 11),
            bg=WHITE_BG,
            fg="red",
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=delete_skill
        )
        delete_btn.pack(anchor="w", pady=4, fill="x")

        refresh_skills()

    def show_tasks_page(self):
        """Daily Task Planner: Schedule professional development activities."""
        profile = self.get_profile()
        tasks = profile["daily_tasks"]

        top = tk.Frame(self.content_frame, bg=WHITE_BG)
        top.pack(fill="x", pady=10)

        title = tk.Label(
            top,
            text="📅 Daily Professional Development Planner",
            font=("Arial", 16, "bold"),
            bg=WHITE_BG,
            fg=BLACK
        )
        title.pack(anchor="w", padx=10, pady=5)

        sep = ttk.Separator(self.content_frame, orient="horizontal")
        sep.pack(fill="x", padx=10, pady=5)

        form_frame = tk.Frame(self.content_frame, bg=WHITE_BG)
        form_frame.pack(fill="x", padx=10, pady=5)

        tk.Label(form_frame, text="Task Description:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=0, column=0, sticky="w", padx=5, pady=2)
        task_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=40)
        task_entry.grid(row=0, column=1, sticky="w", padx=5, pady=2)

        tk.Label(form_frame, text="Date (YYYY-MM-DD):", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=1, column=0, sticky="w", padx=5, pady=2)
        date_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=40)
        date_entry.grid(row=1, column=1, sticky="w", padx=5, pady=2)
        date_entry.insert(0, datetime.now().strftime("%Y-%m-%d"))

        tk.Label(form_frame, text="Category:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=2, column=0, sticky="w", padx=5, pady=2)
        category_var = tk.StringVar(value="Learning")
        category_combo = ttk.Combobox(form_frame, textvariable=category_var, 
                                     values=["Learning", "Networking", "Job Search", "Skill Practice", "Project Work"], 
                                     state="readonly", width=38)
        category_combo.grid(row=2, column=1, sticky="w", padx=5, pady=2)

        tk.Label(form_frame, text="Time Estimate (hours):", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=3, column=0, sticky="w", padx=5, pady=2)
        time_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=40)
        time_entry.grid(row=3, column=1, sticky="w", padx=5, pady=2)

        def add_task():
            description = task_entry.get().strip()
            date = date_entry.get().strip()
            category = category_var.get()
            time_estimate = time_entry.get().strip()

            if not description or not date:
                messagebox.showerror("Error", "Please fill in description and date")
                return

            try:
                datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror("Error", "Invalid date format")
                return

            new_id = (max([t["id"] for t in tasks]) + 1) if tasks else 1
            tasks.append({
                "id": new_id,
                "description": description,
                "date": date,
                "category": category,
                "time_estimate": time_estimate,
                "completed": False,
                "created_date": datetime.now().strftime("%Y-%m-%d")
            })
            save_data(self.data)
            refresh_tasks()
            task_entry.delete(0, "end")
            time_entry.delete(0, "end")

        add_btn = tk.Button(
            form_frame,
            text="Add Task",
            font=("Arial", 11, "bold"),
            bg=PINK_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=add_task
        )
        add_btn.grid(row=3, column=2, sticky="e", padx=10, pady=2)

        list_frame = tk.Frame(self.content_frame, bg=WHITE_BG)
        list_frame.pack(fill="both", expand=True, padx=10, pady=5)

        tk.Label(list_frame, text="Today's Tasks:", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(5, 2))

        tasks_list = tk.Listbox(
            list_frame, 
            font=("Arial", 11),
            bd=2, 
            relief="solid",
            selectbackground=BLUE_LIGHT,
            selectforeground=BLACK,
            highlightthickness=0,
            selectmode="single",
            activestyle="none"
        )
        tasks_list.pack(fill="both", expand=True, side="left", padx=(0, 5), pady=5)

        scrollbar = tk.Scrollbar(list_frame, orient="vertical", command=tasks_list.yview)
        scrollbar.pack(side="left", fill="y")
        tasks_list.config(yscrollcommand=scrollbar.set)

        control_frame = tk.Frame(list_frame, bg=WHITE_BG)
        control_frame.pack(side="left", fill="y", padx=5, pady=5)

        def refresh_tasks():
            tasks_list.delete(0, "end")
            today = datetime.now().strftime("%Y-%m-%d")
            for t in sorted(tasks, key=lambda x: x["date"]):
                if t["date"] == today:
                    status = "✓" if t["completed"] else "○"
                    category_symbol = "📚" if t["category"] == "Learning" else "🤝" if t["category"] == "Networking" else "💼" if t["category"] == "Job Search" else "🛠️" if t["category"] == "Skill Practice" else "🚀"
                    line = f"{status} {category_symbol} {t['description'][:40]:40} ({t['time_estimate']}h)"
                    tasks_list.insert("end", line)

        def mark_complete():
            selection = tasks_list.curselection()
            if not selection:
                messagebox.showwarning("Warning", "Please select a task")
                return
            
            selected_text = tasks_list.get(selection[0])
            # 查找对应的任务
            for t in tasks:
                if t['description'] in selected_text:
                    t['completed'] = True
                    save_data(self.data)
                    refresh_tasks()
                    return

        def delete_task():
            selection = tasks_list.curselection()
            if not selection:
                messagebox.showwarning("Warning", "Please select a task")
                return
            
            if not messagebox.askyesno("Delete Task", "Are you sure you want to delete this task?"):
                return
                
            selected_text = tasks_list.get(selection[0])
            # 查找并删除对应的任务
            for i, t in enumerate(tasks):
                if t['description'] in selected_text:
                    del tasks[i]
                    save_data(self.data)
                    refresh_tasks()
                    return

        complete_btn = tk.Button(
            control_frame,
            text="Mark Complete",
            font=("Arial", 11),
            bg=BLUE_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=mark_complete
        )
        complete_btn.pack(anchor="w", pady=4, fill="x")

        delete_btn = tk.Button(
            control_frame,
            text="Delete Task",
            font=("Arial", 11),
            bg=WHITE_BG,
            fg="red",
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=delete_task
        )
        delete_btn.pack(anchor="w", pady=4, fill="x")

        refresh_tasks()

    def show_achievements_page(self):
        """Achievement Summary & Interview Preparation Tips: View progress and generate simple reports."""
        profile = self.get_profile()
        achievements = profile["achievements"]
        qas = profile["interview_qas"]

        # 创建主容器，允许滚动
        main_container = tk.Frame(self.content_frame, bg=WHITE_BG)
        main_container.pack(fill="both", expand=True)
        
        # 创建Canvas和Scrollbar
        canvas = tk.Canvas(main_container, bg=WHITE_BG, highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        
        # 创建滚动内容框架
        scrollable_frame = tk.Frame(canvas, bg=WHITE_BG)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # 打包Canvas和Scrollbar
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # 绑定鼠标滚轮
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        top = tk.Frame(scrollable_frame, bg=WHITE_BG)
        top.pack(fill="x", pady=10)

        title = tk.Label(
            top,
            text="🏆 Achievement Summary & Interview Preparation",
            font=("Arial", 16, "bold"),
            bg=WHITE_BG,
            fg=BLACK
        )
        title.pack(anchor="w", padx=10, pady=5)

        sep = ttk.Separator(scrollable_frame, orient="horizontal")
        sep.pack(fill="x", padx=10, pady=5)

        # 统计数据
        stats_frame = tk.Frame(scrollable_frame, bg=PINK_LIGHT, bd=2, relief="solid", highlightbackground=BLACK, highlightcolor=BLACK)
        stats_frame.pack(fill="x", padx=10, pady=5)

        # 计算统计数据
        career_goals = len(profile["career_goals"])
        completed_goals = sum(1 for g in profile["career_goals"] if g.get("status") == "Completed")
        skills_log = len(profile["skills_log"])
        daily_tasks = len(profile["daily_tasks"])
        completed_tasks = sum(1 for t in profile["daily_tasks"] if t.get("completed") == True)
        total_achievements = len(achievements)
        total_qas = len(qas)

        tk.Label(stats_frame, text=f"📊 Career Goals: {career_goals} (Completed: {completed_goals})", 
                font=("Arial", 11), bg=PINK_LIGHT, fg=BLACK).grid(row=0, column=0, sticky="w", padx=10, pady=3)
        tk.Label(stats_frame, text=f"📚 Skills/Certifications: {skills_log}", 
                font=("Arial", 11), bg=PINK_LIGHT, fg=BLACK).grid(row=0, column=1, sticky="w", padx=10, pady=3)
        tk.Label(stats_frame, text=f"📅 Daily Tasks: {daily_tasks} (Completed: {completed_tasks})", 
                font=("Arial", 11), bg=PINK_LIGHT, fg=BLACK).grid(row=1, column=0, sticky="w", padx=10, pady=3)
        tk.Label(stats_frame, text=f"🏆 Achievements: {total_achievements} | 💬 Interview Q&As: {total_qas}", 
                font=("Arial", 11), bg=PINK_LIGHT, fg=BLACK).grid(row=1, column=1, sticky="w", padx=10, pady=3)

        body_frame = tk.Frame(scrollable_frame, bg=WHITE_BG)
        body_frame.pack(fill="both", expand=True, padx=10, pady=5)

        # 左侧：成就添加
        left_frame = tk.Frame(body_frame, bg=WHITE_BG)
        left_frame.pack(side="left", fill="both", expand=True, padx=(0, 5))

        tk.Label(left_frame, text="Add Achievement", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(5, 2))

        form_frame = tk.Frame(left_frame, bg=WHITE_BG)
        form_frame.pack(fill="x", pady=5)

        tk.Label(form_frame, text="Achievement Title:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=0, column=0, sticky="w", padx=5, pady=2)
        title_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=35)
        title_entry.grid(row=0, column=1, sticky="w", padx=5, pady=2)

        tk.Label(form_frame, text="Date (YYYY-MM-DD):", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=1, column=0, sticky="w", padx=5, pady=2)
        date_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=35)
        date_entry.grid(row=1, column=1, sticky="w", padx=5, pady=2)
        date_entry.insert(0, datetime.now().strftime("%Y-%m-%d"))

        tk.Label(form_frame, text="Category:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=2, column=0, sticky="w", padx=5, pady=2)
        category_entry = tk.Entry(form_frame, font=("Arial", 11), bd=2, relief="solid", width=35)
        category_entry.grid(row=2, column=1, sticky="w", padx=5, pady=2)

        tk.Label(form_frame, text="Description:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=3, column=0, sticky="nw", padx=5, pady=2)
        desc_text = tk.Text(form_frame, font=("Arial", 10), height=4, width=35, bd=2, relief="solid")
        desc_text.grid(row=3, column=1, sticky="w", padx=5, pady=2)

        def add_achievement():
            title = title_entry.get().strip()
            date = date_entry.get().strip()
            category = category_entry.get().strip()
            description = desc_text.get("1.0", "end").strip()

            if not title or not date:
                messagebox.showerror("Error", "Please enter title and date")
                return

            try:
                datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror("Error", "Invalid date format")
                return

            new_id = (max([a["id"] for a in achievements]) + 1) if achievements else 1
            achievements.append({
                "id": new_id,
                "title": title,
                "date": date,
                "category": category,
                "description": description,
                "added_date": datetime.now().strftime("%Y-%m-%d")
            })
            save_data(self.data)
            refresh_achievements()
            title_entry.delete(0, "end")
            category_entry.delete(0, "end")
            desc_text.delete("1.0", "end")

        add_btn = tk.Button(
            left_frame,
            text="Add Achievement",
            font=("Arial", 11, "bold"),
            bg=PINK_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=add_achievement
        )
        add_btn.pack(anchor="e", pady=5, padx=5)

        tk.Label(left_frame, text="My Achievements:", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(10, 2))

        ach_listbox = tk.Listbox(
            left_frame, 
            font=("Arial", 11),
            bd=2, 
            relief="solid",
            selectbackground=BLUE_LIGHT,
            selectforeground=BLACK,
            highlightthickness=0,
            selectmode="single",
            activestyle="none",
            height=6  # 限制高度
        )
        ach_listbox.pack(fill="both", expand=True, padx=5, pady=5)

        # 右侧：面试准备
        right_frame = tk.Frame(body_frame, bg=WHITE_BG)
        right_frame.pack(side="left", fill="both", expand=True, padx=(5, 0))

        tk.Label(right_frame, text="💡 Interview Tips", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(5, 2))

        tips_frame = tk.Frame(right_frame, bg=WHITE_BG)
        tips_frame.pack(fill="x", padx=5, pady=5)

        tips_list = [
            "Research the company and role before every interview.",
            "Prepare 2-3 stories that show your problem-solving skills.",
            "Practice answering common questions out loud.",
            "Review your own projects and be ready to explain them clearly.",
            "Prepare 2-3 questions to ask the interviewer.",
            "Arrive early and test your equipment for online interviews.",
            "Be honest about your experience and focus on what you learned.",
            "Highlight achievements with specific numbers or results.",
            "Link your skills and experiences to the job requirements.",
            "End the interview by thanking the interviewer for their time."
        ]

        tips_label = tk.Label(tips_frame, text=random.choice(tips_list), font=("Arial", 10), 
                             bg=WHITE_BG, fg=BLACK, wraplength=350, justify="left")
        tips_label.pack(fill="x")

        def show_tip():
            tips_label.config(text=random.choice(tips_list))

        tip_btn = tk.Button(
            right_frame,
            text="Show Random Tip",
            font=("Arial", 11),
            bg=BLUE_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=show_tip
        )
        tip_btn.pack(anchor="w", pady=5, padx=5)

        tk.Label(right_frame, text="💬 Interview Q&A Storage", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(10, 2))

        qa_frame = tk.Frame(right_frame, bg=WHITE_BG)
        qa_frame.pack(fill="both", expand=True, padx=5, pady=5)

        tk.Label(qa_frame, text="Question:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=0, column=0, sticky="w", padx=2, pady=2)
        q_entry = tk.Entry(qa_frame, font=("Arial", 11), bd=2, relief="solid", width=35)
        q_entry.grid(row=0, column=1, sticky="w", padx=2, pady=2)

        tk.Label(qa_frame, text="Answer:", font=("Arial", 11), bg=WHITE_BG, fg=BLACK).grid(row=1, column=0, sticky="nw", padx=2, pady=2)
        a_text = tk.Text(qa_frame, font=("Arial", 10), height=4, width=35, bd=2, relief="solid")
        a_text.grid(row=1, column=1, sticky="w", padx=2, pady=2)

        def add_qa():
            question = q_entry.get().strip()
            answer = a_text.get("1.0", "end").strip()

            if not question or not answer:
                messagebox.showerror("Error", "Please enter both question and answer")
                return

            new_id = (max([x["id"] for x in qas]) + 1) if qas else 1
            qas.append({
                "id": new_id,
                "question": question,
                "answer": answer,
                "added_date": datetime.now().strftime("%Y-%m-%d")
            })
            save_data(self.data)
            refresh_qas()
            q_entry.delete(0, "end")
            a_text.delete("1.0", "end")

        add_qa_btn = tk.Button(
            qa_frame,
            text="Add Q&A",
            font=("Arial", 11),
            bg=PINK_MAIN,
            fg=BLACK,
            bd=2,
            relief="solid",
            highlightbackground=BLACK,
            highlightcolor=BLACK,
            command=add_qa
        )
        add_qa_btn.grid(row=2, column=1, sticky="e", pady=5)

        tk.Label(right_frame, text="Stored Q&As:", font=("Arial", 12, "bold"), bg=WHITE_BG, fg=BLACK).pack(anchor="w", pady=(10, 2))

        qa_listbox = tk.Listbox(
            right_frame, 
            font=("Arial", 10),
            bd=2, 
            relief="solid", 
            height=6,
            selectbackground=BLUE_LIGHT,
            selectforeground=BLACK,
            highlightthickness=0,
            selectmode="single",
            activestyle="none"
        )
        qa_listbox.pack(fill="both", expand=True, padx=5, pady=5)

        def refresh_achievements():
            ach_listbox.delete(0, "end")
            for a in sorted(achievements, key=lambda x: x["date"], reverse=True):
                line = f"{a['date']}  {a['title'][:40]:40}"
                ach_listbox.insert("end", line)

        def refresh_qas():
            qa_listbox.delete(0, "end")
            for qa in sorted(qas, key=lambda x: x["id"]):
                line = f"Q: {qa['question'][:50]}"
                qa_listbox.insert("end", line)

        refresh_achievements()
        refresh_qas()


if __name__ == "__main__":
    app = CareerAssistantApp()
    app.root.mainloop()