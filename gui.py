import tkinter as tk
from tkinter import ttk, messagebox

class CondoManagementApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Condo System v9")
        self.root.geometry("600x400")
        self.root.resizable(False, False)
        
        self.bg_pink = "#FEDFE1"
        self.btn_blue = "#E1F5FE"
        self.root.configure(bg=self.bg_pink)
        
        self.incident_database = []
        self.main_btn_w = 25
        self.action_btn_h = 1
        self.main_btn_h = 2

        self.header_frame = tk.Frame(self.root, bg=self.bg_pink, height=80)
        self.header_frame.pack(fill="x")
        self.header_frame.pack_propagate(False)

        self.back_btn = tk.Button(self.header_frame, text="Back", font=("Arial", 8, "bold"),
                                  bg=self.btn_blue, width=10, height=1, command=self.show_main_menu)
        self.back_btn.place(x=20, y=40)

        self.title_label = tk.Label(self.header_frame, text="CONDO SYSTEM", font=("Helvetica", 14, "bold"), bg=self.bg_pink, fg="#333")
        self.title_label.place(relx=0.5, rely=0.6, anchor="center")

        self.content_frame = tk.Frame(self.root, bg=self.bg_pink)
        self.content_frame.pack(fill="both", expand=True)

        self.show_main_menu()

    def clear_content(self):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

    def validate_unit(self, unit):
        if unit == "0":
            return False, "Unit Number cannot be 0!"
        if not unit.isalnum():
            return False, "Unit Number cannot contain symbols!"
        return True, ""

    def get_next_available_id(self):
        existing_ids = [item["ID"] for item in self.incident_database]
        counter = 1
        while True:
            candidate = f"A{counter:03d}"
            if candidate not in existing_ids:
                return candidate
            counter += 1

    def show_main_menu(self):
        self.clear_content()
        self.back_btn.place_forget()

        btn_area = tk.Frame(self.content_frame, bg=self.bg_pink)
        btn_area.pack(pady=40)

        tk.Button(btn_area, text="ADD NEW INCIDENT", bg=self.btn_blue, width=25, height=2, font=("Arial", 9, "bold"), relief="flat", command=self.show_add_page).pack(pady=10)
        tk.Button(btn_area, text="DATABASE LIST", bg=self.btn_blue, width=25, height=2, font=("Arial", 9, "bold"), relief="flat", command=self.show_database_list).pack(pady=10)

    def show_add_page(self):
        self.clear_content()
        self.back_btn.place(x=20, y=40)

        next_id = self.get_next_available_id()
        tk.Label(self.content_frame, text=f"Auto ID: {next_id}", bg=self.bg_pink, font=("Arial", 9)).pack()

        form = tk.Frame(self.content_frame, bg=self.bg_pink)
        form.pack(pady=10)

        fields = ["Resident Name:", "Unit Number:", "Category:", "Description:"]
        self.add_entries = {}
        for i, f in enumerate(fields):
            tk.Label(form, text=f, bg=self.bg_pink).grid(row=i, column=0, sticky="e", pady=5)
            if f == "Category:":
                self.add_entries[f] = ttk.Combobox(form, values=["Plumbing", "Electrical", "Elevator", "Gym"], width=22)
            else:
                self.add_entries[f] = tk.Entry(form, width=25)
            self.add_entries[f].grid(row=i, column=1, padx=10)

        def save():
            n = self.add_entries["Resident Name:"].get().strip()
            u = self.add_entries["Unit Number:"].get().strip()
            c = self.add_entries["Category:"].get()
            d = self.add_entries["Description:"].get().strip()
            if not n or not u or not c or not d:
                messagebox.showwarning("Error", "All fields required!")
                return
            v, msg = self.validate_unit(u)
            if not v:
                messagebox.showwarning("Error", msg)
                return
            self.incident_database.append({"ID": next_id, "Name": n, "Unit": u, "Cat": c, "Desc": d, "Status": "Pending"})
            messagebox.showinfo("Success", f"Record {next_id} Saved")
            self.show_main_menu()

        tk.Button(self.content_frame, text="SAVE RECORD", bg=self.btn_blue, width=20, height=1, font=("Arial", 9, "bold"), command=save).pack(pady=30)

    def show_database_list(self):
        self.clear_content()
        self.back_btn.place(x=20, y=40)

        search_frame = tk.Frame(self.content_frame, bg=self.bg_pink)
        search_frame.pack(pady=(5, 20))

        self.s_entry = tk.Entry(search_frame, width=25, fg="grey")
        self.s_entry.insert(0, "Enter ID to search")
        self.s_entry.pack(side="left", padx=5)

        def on_entry_click(event):
            if self.s_entry.get() == "Enter ID to search":
                self.s_entry.delete(0, tk.END)
                self.s_entry.config(fg='black')

        def on_focus_out(event):
            if self.s_entry.get() == "":
                self.s_entry.insert(0, "Enter ID to search")
                self.s_entry.config(fg='grey')

        self.s_entry.bind('<FocusIn>', on_entry_click)
        self.s_entry.bind('<FocusOut>', on_focus_out)

        def refresh():
            for r in self.tree.get_children():
                self.tree.delete(r)
            val = self.s_entry.get()
            kw = "" if val == "Enter ID to search" else val.lower()
            for i in self.incident_database:
                if kw in i["ID"].lower() or kw in i["Name"].lower():
                    self.tree.insert("", "end", values=(i["ID"], i["Name"], i["Unit"], i["Desc"], i["Status"]))
            self.act_f.pack_forget()

        tk.Button(search_frame, text="Search", bg=self.btn_blue, command=refresh).pack(side="left")

        cols = ("ID", "Name", "Unit", "Description", "Status")
        self.tree = ttk.Treeview(self.content_frame, columns=cols, show="headings", height=5)
        for c in cols:
            self.tree.heading(c, text=c)
            self.tree.column(c, width=150 if c == "Description" else 85)
        self.tree.pack(padx=10)

        self.act_f = tk.Frame(self.content_frame, bg=self.bg_pink)

        btn_config = {"bg": self.btn_blue, "height": 1, "font": ("Arial", 8, "bold")}
        tk.Button(self.act_f, text="EDIT", width=10, command=lambda: self.go_edit("EDIT"), **btn_config).pack(side="left", padx=8)
        tk.Button(self.act_f, text="UPDATE", width=10, command=lambda: self.go_edit("UPDATE"), **btn_config).pack(side="left", padx=8)
        tk.Button(self.act_f, text="DELETE", width=10, bg="#FF6A6A", fg="white", height=1, font=("Arial", 8, "bold"), command=self.do_del).pack(side="left", padx=8)

        self.tree.bind("<<TreeviewSelect>>", lambda e: self.act_f.pack(pady=(25, 10)) if self.tree.selection() else self.act_f.pack_forget())
        refresh()

    def do_del(self):
        rid = self.tree.item(self.tree.selection()[0])['values'][0]
        if messagebox.askyesno("Confirm", f"Delete {rid}?"):
            self.incident_database = [i for i in self.incident_database if i["ID"] != rid]
            self.show_database_list()

    def go_edit(self, mode):
        rid = self.tree.item(self.tree.selection()[0])['values'][0]
        rec = next(i for i in self.incident_database if i["ID"] == rid)
        self.clear_content()
        self.back_btn.place(x=20, y=40)
        tk.Label(self.content_frame, text=f"{mode}: {rid}", font=("Arial", 11, "bold"), bg=self.bg_pink).pack(pady=10)

        if mode == "EDIT":
            f = tk.Frame(self.content_frame, bg=self.bg_pink)
            f.pack()
            edits = {}
            for i, (l, v) in enumerate([("Name:", rec["Name"]), ("Unit:", rec["Unit"]), ("Desc:", rec["Desc"])]):
                tk.Label(f, text=l, bg=self.bg_pink).grid(row=i, column=0, pady=5, sticky="e")
                edits[l] = tk.Entry(f, width=25)
                edits[l].insert(0, v)
                edits[l].grid(row=i, column=1, padx=10)

            btn_f = tk.Frame(self.content_frame, bg=self.bg_pink)
            btn_f.pack(pady=(60, 10))

            def save_e():
                n = edits["Name:"].get().strip()
                u = edits["Unit:"].get().strip()
                d = edits["Desc:"].get().strip()
                if not n or not u or not d:
                    messagebox.showwarning("Error", "Required!")
                    return
                v, msg = self.validate_unit(u)
                if not v:
                    messagebox.showwarning("Error", msg)
                    return
                rec["Name"] = n
                rec["Unit"] = u
                rec["Desc"] = d
                messagebox.showinfo("Done", "Saved")
                self.show_database_list()

            tk.Button(btn_f, text="SAVE", bg=self.btn_blue, width=12, height=1, font=("Arial", 8, "bold"), command=save_e).pack(side="left", padx=15)
            tk.Button(btn_f, text="CANCEL", bg="white", width=12, height=1, font=("Arial", 8, "bold"), command=self.show_database_list).pack(side="left", padx=15)

        else:
            tk.Label(self.content_frame, text="Select New Status:", bg=self.bg_pink).pack(pady=5)
            st = ttk.Combobox(self.content_frame, values=["Pending", "In Progress", "Resolved"], width=20)
            st.set(rec["Status"])
            st.pack(pady=10)

            btn_f = tk.Frame(self.content_frame, bg=self.bg_pink)
            btn_f.pack(pady=(60, 10))

            def save_u():
                rec["Status"] = st.get()
                messagebox.showinfo("Done", "Updated")
                self.show_database_list()

            tk.Button(btn_f, text="SAVE", bg=self.btn_blue, width=12, height=1, font=("Arial", 8, "bold"), command=save_u).pack(side="left", padx=15)
            tk.Button(btn_f, text="CANCEL", bg="white", width=12, height=1, font=("Arial", 8, "bold"), command=self.show_database_list).pack(side="left", padx=15)

if __name__ == "__main__":
    root = tk.Tk()
    app = CondoManagementApp(root)
    root.mainloop()