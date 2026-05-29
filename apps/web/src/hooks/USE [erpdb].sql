USE [erpdb]
GO

/****** Object:  Table [dbo].[users]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[users](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[email] [varchar](150) NOT NULL,
	[full_name] [varchar](150) NOT NULL,
	[hashed_password] [varchar](255) NOT NULL,
	[created_at] [datetime] NULL,
	[role] [varchar](20) NOT NULL,
	[tenant_id] [int] NULL,
	[phone_number] [varchar](20) NULL,
	[is_active] [bit] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[role_id] [int] NULL,
	[scope_type] [varchar](20) NULL,
	[status] [varchar](20) NULL,
	[password_hash] [varchar](255) NOT NULL,
	[is_protected] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[UserProfile]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[UserProfile](
	[UserId] [int] NOT NULL,
	[ProfileImagePath] [varchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_stories]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_stories](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[requirement_id] [int] NOT NULL,
	[title] [nvarchar](500) NOT NULL,
	[prerequisite] [nvarchar](max) NULL,
	[story] [nvarchar](max) NOT NULL,
	[acceptance_criteria] [nvarchar](max) NULL,
	[tenant_id] [int] NULL,
	[is_super_admin_accessible] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [int] NULL,
	[review_status] [nvarchar](20) NOT NULL,
	[rejection_reason] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_roles]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_roles](
	[user_id] [int] NOT NULL,
	[role_id] [int] NOT NULL,
	[assigned_at] [datetime] NOT NULL,
	[assigned_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[user_id] ASC,
	[role_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_profiles]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_profiles](
	[user_id] [int] NOT NULL,
	[profile_image_path] [varchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[TimesheetEntries]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[TimesheetEntries](
	[OwnerName] [nvarchar](100) NULL,
	[FeatureName] [nvarchar](200) NULL,
	[PageName] [nvarchar](200) NULL,
	[TaskType] [nvarchar](100) NULL,
	[Subtask] [nvarchar](200) NULL,
	[Description] [nvarchar](500) NULL,
	[SpendEfforts] [decimal](5, 2) NULL,
	[CreatedOn] [datetime] NULL,
	[Sprint] [int] NULL
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[theme_templates]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[theme_templates](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](200) NOT NULL,
	[description] [nvarchar](1000) NULL,
	[config] [nvarchar](max) NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
	[created_by] [int] NULL,
	[updated_by] [int] NULL,
 CONSTRAINT [PK_theme_templates] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[test_cases]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[test_cases](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_story_id] [int] NOT NULL,
	[test_case_id] [nvarchar](100) NOT NULL,
	[scenario] [nvarchar](1000) NOT NULL,
	[pre_requisite] [nvarchar](max) NULL,
	[test_data] [nvarchar](max) NULL,
	[steps] [nvarchar](max) NULL,
	[expected_result] [nvarchar](max) NOT NULL,
	[tenant_id] [int] NULL,
	[is_super_admin_accessible] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [int] NULL,
	[review_status] [nvarchar](20) NOT NULL,
	[rejection_reason] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenants]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenants](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[code] [varchar](50) NOT NULL,
	[name] [varchar](200) NOT NULL,
	[description] [varchar](500) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[status] [varchar](16) NOT NULL,
	[owner_name] [nvarchar](200) NULL,
	[email] [nvarchar](255) NULL,
	[phone] [nvarchar](20) NULL,
	[logo_url] [varchar](max) NULL,
	[address_line1] [varchar](200) NULL,
	[address_line2] [varchar](200) NULL,
	[city] [varchar](100) NULL,
	[state] [varchar](100) NULL,
	[pin_code] [varchar](20) NULL,
	[theme_template_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenant_module_assignments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenant_module_assignments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[module_name] [varchar](100) NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_tenant_module] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[module_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenant_features]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenant_features](
	[tenant_id] [int] NOT NULL,
	[feature_id] [int] NOT NULL,
	[enabled] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[tenant_id] ASC,
	[feature_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_tenant_features_tenant_feature] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[feature_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[teachers]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[teachers](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[teacher_code] [varchar](50) NULL,
	[full_name] [varchar](200) NOT NULL,
	[date_of_birth] [date] NULL,
	[gender] [varchar](10) NULL,
	[mobile_number] [varchar](15) NOT NULL,
	[email] [varchar](100) NULL,
	[qualification] [varchar](200) NULL,
	[experience_years] [int] NULL,
	[photo_url] [varchar](max) NULL,
	[class_id] [int] NULL,
	[class_division_id] [int] NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[address] [varchar](500) NULL,
	[city] [varchar](100) NULL,
	[state] [varchar](100) NULL,
	[pincode] [varchar](10) NULL,
	[user_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_teachers_tenant_mobile] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[mobile_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[teacher_assignments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[teacher_assignments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[class_division_id] [int] NOT NULL,
	[teacher_id] [int] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
	[subject_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[subjects]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[subjects](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[name] [varchar](100) NOT NULL,
	[code] [varchar](20) NOT NULL,
	[description] [varchar](500) NULL,
	[class_id] [int] NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[subject_type] [varchar](50) NOT NULL,
 CONSTRAINT [PK_subjects] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_subjects_tenant_code] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[subject_classes]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[subject_classes](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[subject_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[academic_year_id] [int] NULL,
	[class_division_id] [int] NULL,
	[is_mandatory] [bit] NOT NULL,
	[is_active] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_subject_classes_mapping_v2] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[academic_year_id] ASC,
	[class_id] ASC,
	[class_division_id] ASC,
	[subject_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[students]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[students](
	[tenant_id] [int] NOT NULL,
	[student_name] [varchar](150) NOT NULL,
	[student_code] [varchar](50) NULL,
	[class_id] [int] NULL,
	[roll_no] [varchar](20) NULL,
	[parent_name] [varchar](150) NULL,
	[academic_year] [varchar](20) NULL,
	[admission_no] [varchar](50) NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
	[is_active] [bit] NOT NULL,
	[fee_structure_id] [int] NULL,
	[gender] [varchar](10) NULL,
	[date_of_birth] [date] NULL,
	[mobile_number] [varchar](15) NULL,
	[email] [varchar](100) NULL,
	[academic_year_id] [int] NULL,
	[class_division_id] [int] NULL,
	[parent_id] [int] NULL,
	[address] [text] NULL,
	[area] [varchar](100) NULL,
	[city] [varchar](100) NULL,
	[state] [varchar](100) NULL,
	[pincode] [varchar](10) NULL,
	[admission_date] [date] NULL,
	[birth_certificate_url] [varchar](max) NULL,
	[photo_url] [varchar](max) NULL,
	[id] [int] IDENTITY(1,1) NOT NULL,
 CONSTRAINT [PK_students] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[admission_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[student_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[student_invoices]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[student_invoices](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[student_id] [int] NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[invoice_no] [varchar](50) NOT NULL,
	[total_amount] [decimal](10, 2) NOT NULL,
	[paid_amount] [decimal](10, 2) NULL,
	[due_amount] [decimal](10, 2) NOT NULL,
	[due_date] [date] NOT NULL,
	[status] [varchar](20) NOT NULL,
	[created_at] [datetime] NOT NULL,
	[fee_installment_id] [int] NULL,
	[Installment] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[invoice_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[student_invoice_items]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[student_invoice_items](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[invoice_id] [int] NULL,
	[fee_category_id] [int] NULL,
	[amount] [decimal](10, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[student_fee_installments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[student_fee_installments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[assignment_id] [int] NOT NULL,
	[installment_no] [int] NOT NULL,
	[due_date] [date] NOT NULL,
	[amount] [decimal](10, 2) NOT NULL,
	[status] [varchar](20) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[student_fee_details]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[student_fee_details](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[assignment_id] [int] NOT NULL,
	[category] [varchar](100) NOT NULL,
	[amount] [decimal](10, 2) NOT NULL,
	[discount_applied] [decimal](10, 2) NULL,
	[final_amount] [decimal](10, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[student_fee_assignments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[student_fee_assignments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[student_id] [int] NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[discount_id] [int] NULL,
	[additional_fee] [numeric](10, 2) NULL,
	[total_amount] [numeric](10, 2) NOT NULL,
	[final_amount] [numeric](10, 2) NOT NULL,
	[status] [varchar](20) NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[student_attendance]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[student_attendance](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[academic_year_id] [int] NULL,
	[student_id] [int] NOT NULL,
	[class_id] [int] NULL,
	[class_division_id] [int] NULL,
	[attendance_date] [date] NOT NULL,
	[status] [varchar](20) NOT NULL,
	[remarks] [varchar](500) NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_student_attendance_date] UNIQUE NONCLUSTERED 
(
	[student_id] ASC,
	[attendance_date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_student_attendance_v2] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[student_id] ASC,
	[attendance_date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[setup_guides]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[setup_guides](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[title] [varchar](200) NOT NULL,
	[module_name] [varchar](100) NOT NULL,
	[feature_code] [varchar](50) NULL,
	[description] [varchar](max) NULL,
	[youtube_url] [varchar](500) NULL,
	[youtube_video_id] [varchar](50) NULL,
	[youtube_thumbnail] [varchar](500) NULL,
	[doc_url] [varchar](500) NULL,
	[doc_type] [varchar](20) NULL,
	[sort_order] [int] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
 CONSTRAINT [PK_setup_guides] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[setup_guide_views]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[setup_guide_views](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[guide_id] [int] NOT NULL,
	[tenant_id] [int] NOT NULL,
	[viewed_by] [int] NOT NULL,
	[viewed_at] [datetime] NOT NULL,
 CONSTRAINT [PK_setup_guide_views] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[roles]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[roles](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NULL,
	[code] [varchar](50) NOT NULL,
	[name] [varchar](150) NOT NULL,
	[description] [varchar](500) NULL,
	[is_system] [bit] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[scope_type] [varchar](20) NOT NULL,
	[scope] [varchar](20) NOT NULL,
	[id_new] [varchar](36) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_roles_tenant_code] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[role_permissions]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[role_permissions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[role_id] [int] NULL,
	[permission_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[role_menus]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[role_menus](
	[role_id] [int] NOT NULL,
	[menu_id] [int] NOT NULL,
	[granted_at] [datetime] NOT NULL,
	[granted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[role_id] ASC,
	[menu_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[role_menu_permissions]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[role_menu_permissions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NULL,
	[role_id] [int] NOT NULL,
	[menu_id] [int] NOT NULL,
	[can_view] [bit] NOT NULL,
	[can_create] [bit] NOT NULL,
	[can_edit] [bit] NOT NULL,
	[can_delete] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_role_menu_permissions] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[role_id] ASC,
	[menu_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[role_features]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[role_features](
	[role_id] [int] NOT NULL,
	[feature_id] [int] NOT NULL,
	[granted_at] [datetime] NOT NULL,
	[granted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[role_id] ASC,
	[feature_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[revoked_tokens]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[revoked_tokens](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[token] [varchar](512) NOT NULL,
	[user_id] [int] NOT NULL,
	[revoked_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[requirements]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[requirements](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[title] [nvarchar](500) NOT NULL,
	[description] [nvarchar](max) NOT NULL,
	[tenant_id] [int] NULL,
	[is_super_admin_accessible] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [int] NULL,
	[requirement_hash] [nvarchar](64) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[refresh_tokens]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[refresh_tokens](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NOT NULL,
	[token] [varchar](512) NOT NULL,
	[expires_at] [datetime] NOT NULL,
	[is_revoked] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Timesheets]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Timesheets](
	[TimesheetId] [int] IDENTITY(1,1) NOT NULL,
	[OwnerId] [int] NOT NULL,
	[FeatureId] [int] NOT NULL,
	[PageId] [int] NOT NULL,
	[TaskId] [int] NOT NULL,
	[SubtaskId] [int] NOT NULL,
	[SprintId] [int] NOT NULL,
	[Description] [nvarchar](500) NULL,
	[Efforts] [decimal](12, 2) NULL,
	[ActivityDate] [datetime] NULL,
	[CreatedOn] [datetime] NULL,
	[ProjectId] [int] NULL,
	[StatusId] [int] NULL,
	[TaskStartDate] [date] NULL,
	[TaskEndDate] [date] NULL,
	[LastUpdated] [datetime2](0) NULL,
PRIMARY KEY CLUSTERED 
(
	[TimesheetId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_TimesheetEffortLogs]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_TimesheetEffortLogs](
	[LogId] [int] IDENTITY(1,1) NOT NULL,
	[TimesheetId] [int] NOT NULL,
	[WorkingDate] [date] NOT NULL,
	[EffortHours] [decimal](10, 2) NOT NULL,
	[CreatedOn] [datetime2](0) NOT NULL,
 CONSTRAINT [PK_PT_TimesheetEffortLogs] PRIMARY KEY CLUSTERED 
(
	[LogId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_TaskType]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_TaskType](
	[TaskId] [int] IDENTITY(1,1) NOT NULL,
	[TaskName] [nvarchar](100) NOT NULL,
	[ProjectId] [int] NULL,
 CONSTRAINT [PK_PT_TaskType] PRIMARY KEY CLUSTERED 
(
	[TaskId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_TaskType] UNIQUE NONCLUSTERED 
(
	[TaskName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_TaskStatus]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_TaskStatus](
	[StatusId] [int] NOT NULL,
	[StatusName] [nvarchar](50) NOT NULL,
	[SortOrder] [int] NOT NULL,
 CONSTRAINT [PK_PT_TaskStatus] PRIMARY KEY CLUSTERED 
(
	[StatusId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Tasks]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Tasks](
	[TaskId] [int] IDENTITY(1,1) NOT NULL,
	[TaskName] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[TaskId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_TaskCategoryMapping]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_TaskCategoryMapping](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[TaskId] [int] NOT NULL,
	[CategoryId] [int] NOT NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Task_Category] UNIQUE NONCLUSTERED 
(
	[TaskId] ASC,
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_TaskCategories]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_TaskCategories](
	[CategoryId] [int] IDENTITY(1,1) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[CategoryName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Subtasks]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Subtasks](
	[SubtaskId] [int] IDENTITY(1,1) NOT NULL,
	[TaskId] [int] NOT NULL,
	[SubtaskName] [nvarchar](200) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[SubtaskId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Subtask] UNIQUE NONCLUSTERED 
(
	[TaskId] ASC,
	[SubtaskName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_SubTaskCategoryMapping]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_SubTaskCategoryMapping](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[SubTaskId] [int] NOT NULL,
	[CategoryId] [int] NOT NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_SubTask_Category] UNIQUE NONCLUSTERED 
(
	[SubTaskId] ASC,
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Sprints]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Sprints](
	[SprintId] [int] IDENTITY(1,1) NOT NULL,
	[SprintName] [nvarchar](100) NULL,
	[StartDate] [date] NULL,
	[EndDate] [date] NULL,
	[IsActive] [bit] NULL,
	[CreatedOn] [datetime] NULL,
	[ProjectId] [int] NULL,
	[IsCompleted] [bit] NULL,
 CONSTRAINT [PK__PT_Sprin__29F16AC0A2B81672] PRIMARY KEY CLUSTERED 
(
	[SprintId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_SprintPageUsers]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_SprintPageUsers](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[SprintId] [int] NOT NULL,
	[FeatureId] [int] NOT NULL,
	[PageId] [int] NOT NULL,
	[UserId] [int] NOT NULL,
	[ProjectId] [int] NOT NULL,
	[AssignmentRole] [int] NULL,
	[IsPrimary] [int] NULL,
	[UpdatedOn] [datetime2](7) NULL,
	[UpdatedByUserId] [int] NULL,
 CONSTRAINT [PK_PT_SprintPageUsers] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_PT_SprintPageUsers_Sprint_Feature_Page_User_Role] UNIQUE NONCLUSTERED 
(
	[SprintId] ASC,
	[FeatureId] ASC,
	[PageId] ASC,
	[UserId] ASC,
	[AssignmentRole] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_SprintFeaturePages]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_SprintFeaturePages](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[SprintId] [int] NOT NULL,
	[FeatureId] [int] NOT NULL,
	[PageId] [int] NOT NULL,
	[ProjectId] [int] NOT NULL,
 CONSTRAINT [PK_PT_SprintFeaturePages] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_PT_SprintFeaturePages_Sprint_Feature_Page] UNIQUE NONCLUSTERED 
(
	[SprintId] ASC,
	[FeatureId] ASC,
	[PageId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_ProjectUsers]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_ProjectUsers](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ProjectId] [int] NOT NULL,
	[UserId] [int] NOT NULL,
	[ProjectRoleId] [int] NOT NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[ProjectId] ASC,
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_ProjectRole]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_ProjectRole](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[RoleName] [nvarchar](50) NOT NULL,
	[IsSystemRole] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Project]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Project](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[TenantId] [int] NOT NULL,
	[ProjectName] [nvarchar](200) NOT NULL,
	[Description] [nvarchar](max) NULL,
	[IsActive] [bit] NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Pages]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Pages](
	[PageId] [int] IDENTITY(1,1) NOT NULL,
	[FeatureId] [int] NOT NULL,
	[PageName] [nvarchar](200) NOT NULL,
	[ProjectId] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PageId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Page] UNIQUE NONCLUSTERED 
(
	[FeatureId] ASC,
	[PageName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Owners_Delete]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Owners_Delete](
	[OwnerId] [int] IDENTITY(1,1) NOT NULL,
	[OwnerName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[OwnerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[OwnerName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Owners_1]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Owners_1](
	[OwnerId] [int] IDENTITY(1,1) NOT NULL,
	[OwnerName] [varchar](100) NULL,
	[IsActive] [int] NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[OwnerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Owners]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Owners](
	[OwnerId] [int] IDENTITY(1,1) NOT NULL,
	[OwnerName] [varchar](100) NULL,
	[IsActive] [int] NULL,
	[CreatedOn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[OwnerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[PT_Features]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[PT_Features](
	[FeatureId] [int] IDENTITY(1,1) NOT NULL,
	[FeatureName] [nvarchar](200) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedOn] [datetime] NULL,
	[ProjectId] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[FeatureId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[FeatureName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[permissions]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[permissions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[code] [varchar](100) NOT NULL,
	[name] [varchar](200) NOT NULL,
	[module_name] [varchar](100) NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[payments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[payments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[student_id] [int] NOT NULL,
	[installment_id] [int] NOT NULL,
	[amount_paid] [numeric](10, 2) NOT NULL,
	[payment_date] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[parents]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[parents](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[parent_name] [varchar](200) NOT NULL,
	[mobile_number] [varchar](15) NOT NULL,
	[alternate_mobile] [varchar](15) NULL,
	[email] [varchar](100) NULL,
	[address] [varchar](500) NULL,
	[city] [varchar](100) NULL,
	[state] [varchar](100) NULL,
	[pin_code] [varchar](10) NULL,
	[relationship] [varchar](50) NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[society] [varchar](200) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_parents_tenant_mobile] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[mobile_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notices]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notices](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[title] [varchar](255) NOT NULL,
	[description] [varchar](max) NOT NULL,
	[notice_type] [varchar](50) NOT NULL,
	[audience_type] [varchar](20) NOT NULL,
	[publish_date] [datetime] NOT NULL,
	[expiry_date] [datetime] NULL,
	[is_draft] [bit] NOT NULL,
	[is_published] [bit] NOT NULL,
	[send_notification] [bit] NOT NULL,
	[created_by] [int] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[is_deleted] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notice_targets]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notice_targets](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[notice_id] [int] NOT NULL,
	[class_id] [int] NULL,
	[division_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notice_attachments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notice_attachments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[notice_id] [int] NOT NULL,
	[file_name] [varchar](255) NULL,
	[file_path] [varchar](500) NULL,
	[file_type] [varchar](50) NULL,
	[uploaded_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[menus]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[menus](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NULL,
	[parent_id] [int] NULL,
	[name] [varchar](150) NOT NULL,
	[path] [varchar](300) NULL,
	[icon] [varchar](100) NULL,
	[sort_order] [int] NOT NULL,
	[level] [int] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[feature_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_menu] UNIQUE NONCLUSTERED 
(
	[name] ASC,
	[parent_id] ASC,
	[tenant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[leads]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[leads](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[lead_code] [varchar](50) NOT NULL,
	[parent_id] [int] NOT NULL,
	[child_name] [varchar](150) NOT NULL,
	[child_dob] [date] NULL,
	[child_gender] [varchar](10) NULL,
	[lead_source_id] [int] NOT NULL,
	[lead_status_id] [int] NOT NULL,
	[preferred_class_id] [int] NULL,
	[preferred_academic_year_id] [int] NULL,
	[expected_admission_date] [date] NULL,
	[notes] [varchar](max) NULL,
	[remarks] [varchar](max) NULL,
	[converted_to_student_id] [int] NULL,
	[converted_at] [datetime] NULL,
	[converted_by] [int] NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[assigned_to] [int] NULL,
	[next_followup_date] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_leads_tenant_code] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[lead_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[lead_statuses]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[lead_statuses](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NULL,
	[name] [varchar](100) NOT NULL,
	[code] [varchar](50) NOT NULL,
	[sequence_order] [int] NOT NULL,
	[color_code] [varchar](20) NULL,
	[is_terminal] [bit] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_lead_statuses_code] UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[lead_sources]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[lead_sources](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NULL,
	[name] [varchar](100) NOT NULL,
	[code] [varchar](50) NOT NULL,
	[description] [varchar](500) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_lead_sources_code] UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[lead_followups]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[lead_followups](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[lead_id] [int] NOT NULL,
	[followup_date] [date] NOT NULL,
	[followup_time] [time](7) NULL,
	[followup_type] [varchar](20) NOT NULL,
	[followup_notes] [varchar](max) NULL,
	[followup_status] [varchar](20) NOT NULL,
	[completed_at] [datetime] NULL,
	[completed_by] [int] NULL,
	[completion_notes] [varchar](max) NULL,
	[next_followup_date] [date] NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[homework_attachments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[homework_attachments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[homework_id] [int] NOT NULL,
	[file_name] [varchar](255) NOT NULL,
	[file_path] [varchar](500) NOT NULL,
	[file_type] [varchar](50) NULL,
	[file_size_kb] [int] NULL,
	[uploaded_at] [datetime] NOT NULL,
	[uploaded_by] [int] NULL,
 CONSTRAINT [PK_homework_attachments] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[homework]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[homework](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[teacher_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[class_division_id] [int] NULL,
	[subject_id] [int] NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[title] [varchar](255) NOT NULL,
	[instructions] [varchar](max) NULL,
	[assigned_date] [date] NOT NULL,
	[submission_date] [date] NOT NULL,
	[status] [varchar](20) NOT NULL,
	[notify_parents] [bit] NOT NULL,
	[published_at] [datetime] NULL,
	[published_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
 CONSTRAINT [PK_homework] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[holidays]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[holidays](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[holiday_name] [varchar](150) NOT NULL,
	[holiday_type] [varchar](50) NOT NULL,
	[start_date] [date] NOT NULL,
	[end_date] [date] NULL,
	[applicable_for] [nvarchar](500) NOT NULL,
	[description] [varchar](max) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
	[audience_type] [nvarchar](30) NULL,
	[scope_json] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[holiday_targets]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[holiday_targets](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[holiday_id] [int] NOT NULL,
	[class_id] [int] NULL,
	[division_id] [int] NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
 CONSTRAINT [PK_holiday_targets] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_structures]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_structures](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[fee_category_id] [varchar](36) NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[total_amount] [numeric](10, 2) NOT NULL,
	[installment_type] [varchar](20) NOT NULL,
	[num_installments] [int] NOT NULL,
	[description] [varchar](500) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[name] [nvarchar](100) NOT NULL,
	[class_division_id] [int] NULL,
	[multi_category_ids] [varchar](2000) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_structure_categories]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_structure_categories](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[fee_category_id] [varchar](36) NOT NULL,
	[amount] [decimal](10, 2) NOT NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uk_fsc_unique] UNIQUE NONCLUSTERED 
(
	[fee_structure_id] ASC,
	[fee_category_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_receipts]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_receipts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[payment_id] [int] NOT NULL,
	[student_id] [int] NOT NULL,
	[receipt_number] [varchar](50) NOT NULL,
	[receipt_date] [datetime] NOT NULL,
	[total_amount] [numeric](10, 2) NOT NULL,
	[payment_method] [varchar](30) NOT NULL,
	[reference_no] [varchar](100) NULL,
	[generated_by] [int] NULL,
	[generated_at] [datetime] NOT NULL,
	[pdf_url] [varchar](500) NULL,
	[is_cancelled] [bit] NOT NULL,
	[cancelled_at] [datetime] NULL,
	[cancelled_by] [int] NULL,
	[remarks] [varchar](500) NULL,
	[amount_in_words] [varchar](500) NULL,
 CONSTRAINT [PK_fee_receipts] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_fee_receipts_number] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[receipt_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_payments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_payments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[student_id] [int] NOT NULL,
	[payment_date] [datetime] NOT NULL,
	[payment_method] [varchar](30) NOT NULL,
	[reference_no] [varchar](100) NULL,
	[total_amount] [numeric](10, 2) NOT NULL,
	[notes] [varchar](max) NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[fee_installment_id] [int] NULL,
	[paid_amount] [decimal](18, 2) NULL,
	[receipt_number] [varchar](50) NULL,
	[payment_status] [varchar](20) NOT NULL,
	[academic_year_id] [int] NULL,
	[bank_account_holder_name] [varchar](100) NULL,
	[bank_account_no] [varchar](20) NULL,
	[ifsc_code] [varchar](11) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_payment_allocations]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_payment_allocations](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[payment_id] [int] NOT NULL,
	[fee_installment_id] [int] NOT NULL,
	[amount_allocated] [numeric](10, 2) NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_fee_payment_allocations_payment_installment] UNIQUE NONCLUSTERED 
(
	[payment_id] ASC,
	[fee_installment_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_ledger]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_ledger](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[student_id] [int] NOT NULL,
	[academic_year] [varchar](20) NOT NULL,
	[total_fee] [numeric](10, 2) NOT NULL,
	[total_paid] [numeric](10, 2) NOT NULL,
	[total_balance] [numeric](10, 2) NOT NULL,
	[fee_structure_id] [int] NULL,
	[academic_year_id] [int] NULL,
	[created_at] [datetime] NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_fee_ledger_tenant_student_year] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[student_id] ASC,
	[academic_year_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_installments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_installments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[installment_number] [int] NOT NULL,
	[amount] [numeric](10, 2) NOT NULL,
	[due_date] [date] NOT NULL,
	[late_fee_applicable] [bit] NOT NULL,
	[late_fee_amount] [numeric](10, 2) NULL,
	[late_fee_percentage] [numeric](5, 2) NULL,
	[description] [varchar](500) NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[fee_category_id] [varchar](36) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_discounts]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_discounts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[discount_name] [nvarchar](120) NOT NULL,
	[discount_type] [nvarchar](50) NOT NULL,
	[discount_value] [decimal](10, 2) NOT NULL,
	[fee_category] [nvarchar](120) NOT NULL,
	[applicable_class] [nvarchar](120) NULL,
	[description] [nvarchar](max) NULL,
	[status] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
	[is_deleted] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_discount_name_tenant] UNIQUE NONCLUSTERED 
(
	[discount_name] ASC,
	[tenant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_discount]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_discount](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[discount_name] [varchar](150) NOT NULL,
	[discount_type] [varchar](20) NOT NULL,
	[discount_value] [decimal](10, 2) NOT NULL,
	[category] [varchar](100) NULL,
	[class_name] [varchar](100) NULL,
	[description] [varchar](max) NULL,
	[status] [bit] NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_components]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_components](
	[id] [int] NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[category] [varchar](50) NOT NULL,
	[amount] [decimal](10, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[fee_categories]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[fee_categories](
	[id] [varchar](36) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[name] [varchar](100) NOT NULL,
	[code] [varchar](20) NOT NULL,
	[description] [varchar](500) NULL,
	[status] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[academic_year_id] [int] NULL,
	[class_id] [int] NULL,
	[amount] [decimal](10, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uk_fee_category_scope] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[academic_year_id] ASC,
	[class_id] ASC,
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_fee_categories_tenant_code] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[features]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[features](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [varchar](100) NOT NULL,
	[code] [varchar](50) NOT NULL,
	[description] [varchar](500) NULL,
	[category] [varchar](50) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[development_tasks]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[development_tasks](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_story_id] [int] NOT NULL,
	[task_id] [nvarchar](50) NOT NULL,
	[category] [nvarchar](20) NOT NULL,
	[title] [nvarchar](500) NOT NULL,
	[description] [nvarchar](max) NOT NULL,
	[related_scenario] [nvarchar](500) NOT NULL,
	[component] [nvarchar](200) NOT NULL,
	[priority] [nvarchar](20) NOT NULL,
	[estimated_effort] [nvarchar](50) NOT NULL,
	[tenant_id] [int] NULL,
	[created_at] [datetime2](7) NOT NULL,
	[created_by] [int] NULL,
	[depends_on_task_id] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[demo_videos]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[demo_videos](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[module_key] [varchar](120) NOT NULL,
	[module_name] [varchar](200) NOT NULL,
	[title] [varchar](255) NOT NULL,
	[description] [varchar](max) NULL,
	[video_url] [varchar](1000) NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[communication_notices]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[communication_notices](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[title] [varchar](255) NOT NULL,
	[description] [varchar](max) NOT NULL,
	[notice_type] [varchar](30) NOT NULL,
	[audience_type] [varchar](30) NOT NULL,
	[status] [varchar](20) NOT NULL,
	[publish_date] [datetime] NOT NULL,
	[expiry_date] [datetime] NULL,
	[send_notification] [bit] NOT NULL,
	[is_published] [bit] NOT NULL,
	[published_at] [datetime] NULL,
	[unpublished_at] [datetime] NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NOT NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[communication_notice_targets]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[communication_notice_targets](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[notice_id] [int] NOT NULL,
	[class_id] [int] NULL,
	[division_id] [int] NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[communication_notice_attachments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[communication_notice_attachments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[notice_id] [int] NOT NULL,
	[file_name] [varchar](255) NOT NULL,
	[file_path] [varchar](500) NOT NULL,
	[file_type] [varchar](50) NOT NULL,
	[file_size_kb] [int] NULL,
	[uploaded_at] [datetime] NOT NULL,
	[uploaded_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[classes]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[classes](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[name] [varchar](100) NOT NULL,
	[code] [varchar](50) NOT NULL,
	[description] [varchar](500) NULL,
	[capacity] [int] NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
	[academic_year_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[class_fee_structure_assignments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[class_fee_structure_assignments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[effective_date] [date] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
	[created_by] [int] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[class_fee_structure_assignment]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[class_fee_structure_assignment](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[academic_year_id] [int] NOT NULL,
	[class_id] [int] NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[effective_date] [date] NOT NULL,
	[end_date] [date] NULL,
	[status] [varchar](8) NOT NULL,
	[created_by] [int] NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[class_fee_assignments]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[class_fee_assignments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[academic_year] [varchar](9) NOT NULL,
	[class_id] [int] NOT NULL,
	[fee_structure_id] [int] NOT NULL,
	[effective_date] [date] NOT NULL,
	[status] [varchar](20) NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[class_divisions]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[class_divisions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[class_id] [int] NOT NULL,
	[division_name] [varchar](10) NOT NULL,
	[capacity] [int] NULL,
	[is_active] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[alembic_version]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[alembic_version](
	[version_num] [varchar](32) NOT NULL,
 CONSTRAINT [alembic_version_pkc] PRIMARY KEY CLUSTERED 
(
	[version_num] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[academic_years]    Script Date: 28-05-2026 20:27:44 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[academic_years](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[tenant_id] [int] NOT NULL,
	[name] [varchar](50) NOT NULL,
	[code] [varchar](20) NOT NULL,
	[start_date] [date] NOT NULL,
	[end_date] [date] NOT NULL,
	[is_current] [bit] NOT NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[created_by] [int] NULL,
	[updated_at] [datetime] NULL,
	[updated_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[deleted_at] [datetime] NULL,
	[deleted_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_academic_years_tenant_code] UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ('user') FOR [role]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ('') FOR [password_hash]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [is_protected]
GO

ALTER TABLE [dbo].[user_stories] ADD  DEFAULT ((0)) FOR [is_super_admin_accessible]
GO

ALTER TABLE [dbo].[user_stories] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[user_stories] ADD  CONSTRAINT [DF_user_stories_review_status]  DEFAULT ('draft') FOR [review_status]
GO

ALTER TABLE [dbo].[user_roles] ADD  DEFAULT (getutcdate()) FOR [assigned_at]
GO

ALTER TABLE [dbo].[theme_templates] ADD  CONSTRAINT [DF_theme_templates_created_at]  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[test_cases] ADD  DEFAULT ((0)) FOR [is_super_admin_accessible]
GO

ALTER TABLE [dbo].[test_cases] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[test_cases] ADD  CONSTRAINT [DF_test_cases_review_status]  DEFAULT ('draft') FOR [review_status]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ('ACTIVE') FOR [status]
GO

ALTER TABLE [dbo].[teachers] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[teachers] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[teachers] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[teacher_assignments] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[teacher_assignments] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[teacher_assignments] ADD  DEFAULT (getdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[subjects] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[subjects] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[subjects] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[subjects] ADD  DEFAULT ('Theory') FOR [subject_type]
GO

ALTER TABLE [dbo].[subject_classes] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[subject_classes] ADD  DEFAULT ((1)) FOR [is_mandatory]
GO

ALTER TABLE [dbo].[subject_classes] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[students] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[students] ADD  DEFAULT (getdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[students] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[student_invoices] ADD  DEFAULT ((0)) FOR [paid_amount]
GO

ALTER TABLE [dbo].[student_fee_assignments] ADD  DEFAULT ('Pending') FOR [status]
GO

ALTER TABLE [dbo].[setup_guides] ADD  DEFAULT ((0)) FOR [sort_order]
GO

ALTER TABLE [dbo].[setup_guides] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[setup_guides] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[setup_guides] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[setup_guide_views] ADD  DEFAULT (getdate()) FOR [viewed_at]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ((0)) FOR [is_system]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ('PLATFORM') FOR [scope_type]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ('Platform') FOR [scope]
GO

ALTER TABLE [dbo].[role_menus] ADD  DEFAULT (getutcdate()) FOR [granted_at]
GO

ALTER TABLE [dbo].[role_menu_permissions] ADD  DEFAULT ((0)) FOR [can_view]
GO

ALTER TABLE [dbo].[role_menu_permissions] ADD  DEFAULT ((0)) FOR [can_create]
GO

ALTER TABLE [dbo].[role_menu_permissions] ADD  DEFAULT ((0)) FOR [can_edit]
GO

ALTER TABLE [dbo].[role_menu_permissions] ADD  DEFAULT ((0)) FOR [can_delete]
GO

ALTER TABLE [dbo].[role_menu_permissions] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[role_features] ADD  DEFAULT (getutcdate()) FOR [granted_at]
GO

ALTER TABLE [dbo].[requirements] ADD  DEFAULT ((0)) FOR [is_super_admin_accessible]
GO

ALTER TABLE [dbo].[requirements] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[PT_Timesheets] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_TimesheetEffortLogs] ADD  CONSTRAINT [DF_PT_TEL_Created]  DEFAULT (sysutcdatetime()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_TaskStatus] ADD  CONSTRAINT [DF_PT_TaskStatus_Sort]  DEFAULT ((0)) FOR [SortOrder]
GO

ALTER TABLE [dbo].[PT_TaskCategoryMapping] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_TaskCategories] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[PT_TaskCategories] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_SubTaskCategoryMapping] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_Sprints] ADD  CONSTRAINT [DF__PT_Sprint__IsAct__59E54FE7]  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[PT_Sprints] ADD  CONSTRAINT [DF__PT_Sprint__Creat__5AD97420]  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_Sprints] ADD  CONSTRAINT [DF_PT_Sprints_IsCompleted]  DEFAULT ((0)) FOR [IsCompleted]
GO

ALTER TABLE [dbo].[PT_ProjectUsers] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[PT_ProjectRole] ADD  DEFAULT ((1)) FOR [IsSystemRole]
GO

ALTER TABLE [dbo].[PT_Project] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[PT_Project] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_Owners_Delete] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[PT_Owners_Delete] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[PT_Features] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[PT_Features] ADD  DEFAULT (getdate()) FOR [CreatedOn]
GO

ALTER TABLE [dbo].[permissions] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[parents] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[parents] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[menus] ADD  DEFAULT ((0)) FOR [sort_order]
GO

ALTER TABLE [dbo].[menus] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[menus] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[menus] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[leads] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[leads] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[lead_statuses] ADD  DEFAULT ('0') FOR [is_terminal]
GO

ALTER TABLE [dbo].[lead_statuses] ADD  DEFAULT ('1') FOR [is_active]
GO

ALTER TABLE [dbo].[lead_statuses] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[lead_sources] ADD  DEFAULT ('1') FOR [is_active]
GO

ALTER TABLE [dbo].[lead_sources] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[lead_followups] ADD  DEFAULT ('Pending') FOR [followup_status]
GO

ALTER TABLE [dbo].[lead_followups] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[homework_attachments] ADD  DEFAULT (getdate()) FOR [uploaded_at]
GO

ALTER TABLE [dbo].[homework] ADD  DEFAULT (CONVERT([date],getdate())) FOR [assigned_date]
GO

ALTER TABLE [dbo].[homework] ADD  DEFAULT ('draft') FOR [status]
GO

ALTER TABLE [dbo].[homework] ADD  DEFAULT ((0)) FOR [notify_parents]
GO

ALTER TABLE [dbo].[homework] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[homework] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[holidays] ADD  DEFAULT ((1)) FOR [tenant_id]
GO

ALTER TABLE [dbo].[holidays] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[holidays] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[holidays] ADD  DEFAULT (getdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[holiday_targets] ADD  CONSTRAINT [DF_holiday_targets_created_at]  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[holiday_targets] ADD  CONSTRAINT [DF_holiday_targets_is_deleted]  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[fee_structures] ADD  DEFAULT ('1') FOR [is_active]
GO

ALTER TABLE [dbo].[fee_structures] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_structures] ADD  DEFAULT ('0') FOR [is_deleted]
GO

ALTER TABLE [dbo].[fee_structures] ADD  DEFAULT ('') FOR [name]
GO

ALTER TABLE [dbo].[fee_structure_categories] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_structure_categories] ADD  DEFAULT (getdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[fee_receipts] ADD  DEFAULT (getdate()) FOR [receipt_date]
GO

ALTER TABLE [dbo].[fee_receipts] ADD  DEFAULT (getdate()) FOR [generated_at]
GO

ALTER TABLE [dbo].[fee_receipts] ADD  DEFAULT ((0)) FOR [is_cancelled]
GO

ALTER TABLE [dbo].[fee_payments] ADD  DEFAULT (sysutcdatetime()) FOR [payment_date]
GO

ALTER TABLE [dbo].[fee_payments] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_payments] ADD  DEFAULT ('completed') FOR [payment_status]
GO

ALTER TABLE [dbo].[fee_payment_allocations] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_ledger] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_installments] ADD  DEFAULT ('0') FOR [late_fee_applicable]
GO

ALTER TABLE [dbo].[fee_installments] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_installments] ADD  DEFAULT ('0') FOR [is_deleted]
GO

ALTER TABLE [dbo].[fee_discounts] ADD  DEFAULT ((1)) FOR [status]
GO

ALTER TABLE [dbo].[fee_discounts] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]
GO

ALTER TABLE [dbo].[fee_discounts] ADD  DEFAULT (sysutcdatetime()) FOR [updated_at]
GO

ALTER TABLE [dbo].[fee_discounts] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[fee_categories] ADD  DEFAULT ('1') FOR [status]
GO

ALTER TABLE [dbo].[fee_categories] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[features] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[features] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[features] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[development_tasks] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[communication_notices] ADD  DEFAULT ('DRAFT') FOR [status]
GO

ALTER TABLE [dbo].[communication_notices] ADD  DEFAULT (getdate()) FOR [publish_date]
GO

ALTER TABLE [dbo].[communication_notices] ADD  DEFAULT ((0)) FOR [send_notification]
GO

ALTER TABLE [dbo].[communication_notices] ADD  DEFAULT ((0)) FOR [is_published]
GO

ALTER TABLE [dbo].[communication_notices] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[communication_notices] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[communication_notice_targets] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[communication_notice_targets] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[communication_notice_attachments] ADD  DEFAULT (getdate()) FOR [uploaded_at]
GO

ALTER TABLE [dbo].[communication_notice_attachments] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[classes] ADD  DEFAULT ('1') FOR [is_active]
GO

ALTER TABLE [dbo].[classes] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[classes] ADD  DEFAULT ('0') FOR [is_deleted]
GO

ALTER TABLE [dbo].[class_fee_assignments] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[class_fee_assignments] ADD  DEFAULT (getdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[class_divisions] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[academic_years] ADD  DEFAULT ('0') FOR [is_current]
GO

ALTER TABLE [dbo].[academic_years] ADD  DEFAULT ('1') FOR [is_active]
GO

ALTER TABLE [dbo].[academic_years] ADD  DEFAULT (getdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[academic_years] ADD  DEFAULT ('0') FOR [is_deleted]
GO

ALTER TABLE [dbo].[users]  WITH CHECK ADD  CONSTRAINT [fk_users_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[users] CHECK CONSTRAINT [fk_users_tenant]
GO

ALTER TABLE [dbo].[UserProfile]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[users] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[user_stories]  WITH CHECK ADD  CONSTRAINT [fk_user_stories_requirement] FOREIGN KEY([requirement_id])
REFERENCES [dbo].[requirements] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[user_stories] CHECK CONSTRAINT [fk_user_stories_requirement]
GO

ALTER TABLE [dbo].[user_stories]  WITH CHECK ADD  CONSTRAINT [fk_user_stories_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[user_stories] CHECK CONSTRAINT [fk_user_stories_tenant]
GO

ALTER TABLE [dbo].[user_roles]  WITH CHECK ADD FOREIGN KEY([role_id])
REFERENCES [dbo].[roles] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[user_roles]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[user_profiles]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[test_cases]  WITH CHECK ADD  CONSTRAINT [fk_test_cases_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[test_cases] CHECK CONSTRAINT [fk_test_cases_tenant]
GO

ALTER TABLE [dbo].[test_cases]  WITH CHECK ADD  CONSTRAINT [fk_test_cases_user_story] FOREIGN KEY([user_story_id])
REFERENCES [dbo].[user_stories] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[test_cases] CHECK CONSTRAINT [fk_test_cases_user_story]
GO

ALTER TABLE [dbo].[tenants]  WITH CHECK ADD  CONSTRAINT [fk_tenants_theme_template_id] FOREIGN KEY([theme_template_id])
REFERENCES [dbo].[theme_templates] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[tenants] CHECK CONSTRAINT [fk_tenants_theme_template_id]
GO

ALTER TABLE [dbo].[tenant_module_assignments]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[tenant_features]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[tenant_features]  WITH CHECK ADD  CONSTRAINT [fk_tenant_features_feature] FOREIGN KEY([feature_id])
REFERENCES [dbo].[features] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[tenant_features] CHECK CONSTRAINT [fk_tenant_features_feature]
GO

ALTER TABLE [dbo].[teachers]  WITH CHECK ADD  CONSTRAINT [fk_teachers_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[teachers] CHECK CONSTRAINT [fk_teachers_class]
GO

ALTER TABLE [dbo].[teachers]  WITH CHECK ADD  CONSTRAINT [fk_teachers_division] FOREIGN KEY([class_division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[teachers] CHECK CONSTRAINT [fk_teachers_division]
GO

ALTER TABLE [dbo].[teachers]  WITH CHECK ADD  CONSTRAINT [fk_teachers_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[teachers] CHECK CONSTRAINT [fk_teachers_tenant]
GO

ALTER TABLE [dbo].[teachers]  WITH CHECK ADD  CONSTRAINT [FK_Teachers_Users] FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[teachers] CHECK CONSTRAINT [FK_Teachers_Users]
GO

ALTER TABLE [dbo].[subjects]  WITH CHECK ADD  CONSTRAINT [fk_subjects_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[subjects] CHECK CONSTRAINT [fk_subjects_class]
GO

ALTER TABLE [dbo].[subjects]  WITH CHECK ADD  CONSTRAINT [fk_subjects_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[subjects] CHECK CONSTRAINT [fk_subjects_created_by]
GO

ALTER TABLE [dbo].[subjects]  WITH CHECK ADD  CONSTRAINT [fk_subjects_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[subjects] CHECK CONSTRAINT [fk_subjects_tenant]
GO

ALTER TABLE [dbo].[subject_classes]  WITH CHECK ADD  CONSTRAINT [fk_subject_classes_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[subject_classes] CHECK CONSTRAINT [fk_subject_classes_class]
GO

ALTER TABLE [dbo].[subject_classes]  WITH CHECK ADD  CONSTRAINT [fk_subject_classes_subject] FOREIGN KEY([subject_id])
REFERENCES [dbo].[subjects] ([id])
GO

ALTER TABLE [dbo].[subject_classes] CHECK CONSTRAINT [fk_subject_classes_subject]
GO

ALTER TABLE [dbo].[subject_classes]  WITH CHECK ADD  CONSTRAINT [fk_subject_classes_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[subject_classes] CHECK CONSTRAINT [fk_subject_classes_tenant]
GO

ALTER TABLE [dbo].[students]  WITH CHECK ADD  CONSTRAINT [fk_students_academic_year] FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[students] CHECK CONSTRAINT [fk_students_academic_year]
GO

ALTER TABLE [dbo].[students]  WITH CHECK ADD  CONSTRAINT [fk_students_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[students] CHECK CONSTRAINT [fk_students_class]
GO

ALTER TABLE [dbo].[students]  WITH CHECK ADD  CONSTRAINT [FK_students_class_divisions] FOREIGN KEY([class_division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[students] CHECK CONSTRAINT [FK_students_class_divisions]
GO

ALTER TABLE [dbo].[students]  WITH CHECK ADD  CONSTRAINT [fk_students_parent] FOREIGN KEY([parent_id])
REFERENCES [dbo].[parents] ([id])
GO

ALTER TABLE [dbo].[students] CHECK CONSTRAINT [fk_students_parent]
GO

ALTER TABLE [dbo].[students]  WITH CHECK ADD  CONSTRAINT [fk_students_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[students] CHECK CONSTRAINT [fk_students_tenant]
GO

ALTER TABLE [dbo].[student_invoices]  WITH CHECK ADD FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[student_invoices]  WITH CHECK ADD FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[student_invoices]  WITH CHECK ADD FOREIGN KEY([fee_installment_id])
REFERENCES [dbo].[fee_installments] ([id])
GO

ALTER TABLE [dbo].[student_invoices]  WITH CHECK ADD FOREIGN KEY([fee_structure_id])
REFERENCES [dbo].[fee_structures] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([class_division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([student_id])
REFERENCES [dbo].[students] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[student_attendance]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[setup_guides]  WITH CHECK ADD  CONSTRAINT [fk_sg_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[setup_guides] CHECK CONSTRAINT [fk_sg_created_by]
GO

ALTER TABLE [dbo].[setup_guides]  WITH CHECK ADD  CONSTRAINT [fk_sg_deleted_by] FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[setup_guides] CHECK CONSTRAINT [fk_sg_deleted_by]
GO

ALTER TABLE [dbo].[setup_guides]  WITH CHECK ADD  CONSTRAINT [fk_sg_updated_by] FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[setup_guides] CHECK CONSTRAINT [fk_sg_updated_by]
GO

ALTER TABLE [dbo].[setup_guide_views]  WITH CHECK ADD  CONSTRAINT [fk_sgv_guide] FOREIGN KEY([guide_id])
REFERENCES [dbo].[setup_guides] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[setup_guide_views] CHECK CONSTRAINT [fk_sgv_guide]
GO

ALTER TABLE [dbo].[setup_guide_views]  WITH CHECK ADD  CONSTRAINT [fk_sgv_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[setup_guide_views] CHECK CONSTRAINT [fk_sgv_tenant]
GO

ALTER TABLE [dbo].[setup_guide_views]  WITH CHECK ADD  CONSTRAINT [fk_sgv_user] FOREIGN KEY([viewed_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[setup_guide_views] CHECK CONSTRAINT [fk_sgv_user]
GO

ALTER TABLE [dbo].[roles]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[role_permissions]  WITH CHECK ADD FOREIGN KEY([role_id])
REFERENCES [dbo].[roles] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[role_menus]  WITH CHECK ADD FOREIGN KEY([menu_id])
REFERENCES [dbo].[menus] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[role_menus]  WITH CHECK ADD FOREIGN KEY([role_id])
REFERENCES [dbo].[roles] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[role_menu_permissions]  WITH CHECK ADD  CONSTRAINT [fk_role_menu_perm_menu] FOREIGN KEY([menu_id])
REFERENCES [dbo].[menus] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[role_menu_permissions] CHECK CONSTRAINT [fk_role_menu_perm_menu]
GO

ALTER TABLE [dbo].[role_menu_permissions]  WITH CHECK ADD  CONSTRAINT [fk_role_menu_perm_role] FOREIGN KEY([role_id])
REFERENCES [dbo].[roles] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[role_menu_permissions] CHECK CONSTRAINT [fk_role_menu_perm_role]
GO

ALTER TABLE [dbo].[role_menu_permissions]  WITH CHECK ADD  CONSTRAINT [fk_role_menu_perm_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[role_menu_permissions] CHECK CONSTRAINT [fk_role_menu_perm_tenant]
GO

ALTER TABLE [dbo].[role_features]  WITH CHECK ADD FOREIGN KEY([role_id])
REFERENCES [dbo].[roles] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[revoked_tokens]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[requirements]  WITH CHECK ADD  CONSTRAINT [fk_requirements_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[requirements] CHECK CONSTRAINT [fk_requirements_tenant]
GO

ALTER TABLE [dbo].[refresh_tokens]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_Timesheets]  WITH CHECK ADD  CONSTRAINT [FK_PT_Timesheets_PT_TaskStatus] FOREIGN KEY([StatusId])
REFERENCES [dbo].[PT_TaskStatus] ([StatusId])
GO

ALTER TABLE [dbo].[PT_Timesheets] CHECK CONSTRAINT [FK_PT_Timesheets_PT_TaskStatus]
GO

ALTER TABLE [dbo].[PT_Timesheets]  WITH CHECK ADD  CONSTRAINT [FK_TS_Feature] FOREIGN KEY([FeatureId])
REFERENCES [dbo].[PT_Features] ([FeatureId])
GO

ALTER TABLE [dbo].[PT_Timesheets] CHECK CONSTRAINT [FK_TS_Feature]
GO

ALTER TABLE [dbo].[PT_Timesheets]  WITH CHECK ADD  CONSTRAINT [FK_TS_Page] FOREIGN KEY([PageId])
REFERENCES [dbo].[PT_Pages] ([PageId])
GO

ALTER TABLE [dbo].[PT_Timesheets] CHECK CONSTRAINT [FK_TS_Page]
GO

ALTER TABLE [dbo].[PT_Timesheets]  WITH CHECK ADD  CONSTRAINT [FK_TS_Sprint] FOREIGN KEY([SprintId])
REFERENCES [dbo].[PT_Sprints] ([SprintId])
GO

ALTER TABLE [dbo].[PT_Timesheets] CHECK CONSTRAINT [FK_TS_Sprint]
GO

ALTER TABLE [dbo].[PT_Timesheets]  WITH CHECK ADD  CONSTRAINT [FK_TS_Subtask] FOREIGN KEY([SubtaskId])
REFERENCES [dbo].[PT_Subtasks] ([SubtaskId])
GO

ALTER TABLE [dbo].[PT_Timesheets] CHECK CONSTRAINT [FK_TS_Subtask]
GO

ALTER TABLE [dbo].[PT_Timesheets]  WITH CHECK ADD  CONSTRAINT [FK_TS_TaskType] FOREIGN KEY([TaskId])
REFERENCES [dbo].[PT_TaskType] ([TaskId])
GO

ALTER TABLE [dbo].[PT_Timesheets] CHECK CONSTRAINT [FK_TS_TaskType]
GO

ALTER TABLE [dbo].[PT_TimesheetEffortLogs]  WITH CHECK ADD  CONSTRAINT [FK_PT_TimesheetEffortLogs_PT_Timesheets] FOREIGN KEY([TimesheetId])
REFERENCES [dbo].[PT_Timesheets] ([TimesheetId])
GO

ALTER TABLE [dbo].[PT_TimesheetEffortLogs] CHECK CONSTRAINT [FK_PT_TimesheetEffortLogs_PT_Timesheets]
GO

ALTER TABLE [dbo].[PT_TaskCategoryMapping]  WITH CHECK ADD  CONSTRAINT [FK_TCM_Category] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[PT_TaskCategories] ([CategoryId])
GO

ALTER TABLE [dbo].[PT_TaskCategoryMapping] CHECK CONSTRAINT [FK_TCM_Category]
GO

ALTER TABLE [dbo].[PT_TaskCategoryMapping]  WITH CHECK ADD  CONSTRAINT [FK_TCM_TaskType] FOREIGN KEY([TaskId])
REFERENCES [dbo].[PT_TaskType] ([TaskId])
GO

ALTER TABLE [dbo].[PT_TaskCategoryMapping] CHECK CONSTRAINT [FK_TCM_TaskType]
GO

ALTER TABLE [dbo].[PT_Subtasks]  WITH CHECK ADD  CONSTRAINT [FK_Subtask_TaskType] FOREIGN KEY([TaskId])
REFERENCES [dbo].[PT_TaskType] ([TaskId])
GO

ALTER TABLE [dbo].[PT_Subtasks] CHECK CONSTRAINT [FK_Subtask_TaskType]
GO

ALTER TABLE [dbo].[PT_SubTaskCategoryMapping]  WITH CHECK ADD  CONSTRAINT [FK_STCM_Category] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[PT_TaskCategories] ([CategoryId])
GO

ALTER TABLE [dbo].[PT_SubTaskCategoryMapping] CHECK CONSTRAINT [FK_STCM_Category]
GO

ALTER TABLE [dbo].[PT_SubTaskCategoryMapping]  WITH CHECK ADD  CONSTRAINT [FK_STCM_TaskType] FOREIGN KEY([SubTaskId])
REFERENCES [dbo].[PT_Subtasks] ([SubtaskId])
GO

ALTER TABLE [dbo].[PT_SubTaskCategoryMapping] CHECK CONSTRAINT [FK_STCM_TaskType]
GO

ALTER TABLE [dbo].[PT_SprintPageUsers]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintPageUsers_Feature] FOREIGN KEY([FeatureId])
REFERENCES [dbo].[PT_Features] ([FeatureId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintPageUsers] CHECK CONSTRAINT [FK_PT_SprintPageUsers_Feature]
GO

ALTER TABLE [dbo].[PT_SprintPageUsers]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintPageUsers_Page] FOREIGN KEY([PageId])
REFERENCES [dbo].[PT_Pages] ([PageId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintPageUsers] CHECK CONSTRAINT [FK_PT_SprintPageUsers_Page]
GO

ALTER TABLE [dbo].[PT_SprintPageUsers]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintPageUsers_Project] FOREIGN KEY([ProjectId])
REFERENCES [dbo].[PT_Project] ([Id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintPageUsers] CHECK CONSTRAINT [FK_PT_SprintPageUsers_Project]
GO

ALTER TABLE [dbo].[PT_SprintPageUsers]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintPageUsers_Sprint] FOREIGN KEY([SprintId])
REFERENCES [dbo].[PT_Sprints] ([SprintId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintPageUsers] CHECK CONSTRAINT [FK_PT_SprintPageUsers_Sprint]
GO

ALTER TABLE [dbo].[PT_SprintPageUsers]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintPageUsers_UpdatedByUser] FOREIGN KEY([UpdatedByUserId])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[PT_SprintPageUsers] CHECK CONSTRAINT [FK_PT_SprintPageUsers_UpdatedByUser]
GO

ALTER TABLE [dbo].[PT_SprintPageUsers]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintPageUsers_User] FOREIGN KEY([UserId])
REFERENCES [dbo].[users] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintPageUsers] CHECK CONSTRAINT [FK_PT_SprintPageUsers_User]
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintFeaturePages_Feature] FOREIGN KEY([FeatureId])
REFERENCES [dbo].[PT_Features] ([FeatureId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages] CHECK CONSTRAINT [FK_PT_SprintFeaturePages_Feature]
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintFeaturePages_Page] FOREIGN KEY([PageId])
REFERENCES [dbo].[PT_Pages] ([PageId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages] CHECK CONSTRAINT [FK_PT_SprintFeaturePages_Page]
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintFeaturePages_Project] FOREIGN KEY([ProjectId])
REFERENCES [dbo].[PT_Project] ([Id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages] CHECK CONSTRAINT [FK_PT_SprintFeaturePages_Project]
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages]  WITH CHECK ADD  CONSTRAINT [FK_PT_SprintFeaturePages_Sprint] FOREIGN KEY([SprintId])
REFERENCES [dbo].[PT_Sprints] ([SprintId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[PT_SprintFeaturePages] CHECK CONSTRAINT [FK_PT_SprintFeaturePages_Sprint]
GO

ALTER TABLE [dbo].[PT_ProjectUsers]  WITH CHECK ADD FOREIGN KEY([ProjectId])
REFERENCES [dbo].[PT_Project] ([Id])
GO

ALTER TABLE [dbo].[PT_ProjectUsers]  WITH CHECK ADD FOREIGN KEY([ProjectRoleId])
REFERENCES [dbo].[PT_ProjectRole] ([Id])
GO

ALTER TABLE [dbo].[PT_ProjectUsers]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[PT_Project]  WITH CHECK ADD FOREIGN KEY([TenantId])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[PT_Pages]  WITH CHECK ADD  CONSTRAINT [FK_Pages_Feature] FOREIGN KEY([FeatureId])
REFERENCES [dbo].[PT_Features] ([FeatureId])
GO

ALTER TABLE [dbo].[PT_Pages] CHECK CONSTRAINT [FK_Pages_Feature]
GO

ALTER TABLE [dbo].[payments]  WITH CHECK ADD FOREIGN KEY([installment_id])
REFERENCES [dbo].[fee_installments] ([id])
GO

ALTER TABLE [dbo].[parents]  WITH CHECK ADD  CONSTRAINT [fk_parents_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[parents] CHECK CONSTRAINT [fk_parents_created_by]
GO

ALTER TABLE [dbo].[parents]  WITH CHECK ADD  CONSTRAINT [fk_parents_deleted_by] FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[parents] CHECK CONSTRAINT [fk_parents_deleted_by]
GO

ALTER TABLE [dbo].[parents]  WITH CHECK ADD  CONSTRAINT [fk_parents_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[parents] CHECK CONSTRAINT [fk_parents_tenant]
GO

ALTER TABLE [dbo].[parents]  WITH CHECK ADD  CONSTRAINT [fk_parents_updated_by] FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[parents] CHECK CONSTRAINT [fk_parents_updated_by]
GO

ALTER TABLE [dbo].[notices]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[notices]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[notices]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[notice_targets]  WITH CHECK ADD FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[notice_targets]  WITH CHECK ADD FOREIGN KEY([division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[notice_targets]  WITH CHECK ADD FOREIGN KEY([notice_id])
REFERENCES [dbo].[notices] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[notice_attachments]  WITH CHECK ADD FOREIGN KEY([notice_id])
REFERENCES [dbo].[notices] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[menus]  WITH CHECK ADD FOREIGN KEY([parent_id])
REFERENCES [dbo].[menus] ([id])
GO

ALTER TABLE [dbo].[menus]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[menus]  WITH CHECK ADD  CONSTRAINT [fk_menus_feature_id] FOREIGN KEY([feature_id])
REFERENCES [dbo].[features] ([id])
GO

ALTER TABLE [dbo].[menus] CHECK CONSTRAINT [fk_menus_feature_id]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD FOREIGN KEY([assigned_to])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_academic_year] FOREIGN KEY([preferred_academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_academic_year]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_class] FOREIGN KEY([preferred_class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_class]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_converted_by] FOREIGN KEY([converted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_converted_by]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_converted_to_student] FOREIGN KEY([converted_to_student_id])
REFERENCES [dbo].[students] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_converted_to_student]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_created_by]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_deleted_by] FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_deleted_by]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_parent] FOREIGN KEY([parent_id])
REFERENCES [dbo].[parents] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_parent]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_source] FOREIGN KEY([lead_source_id])
REFERENCES [dbo].[lead_sources] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_source]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_status] FOREIGN KEY([lead_status_id])
REFERENCES [dbo].[lead_statuses] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_status]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_tenant]
GO

ALTER TABLE [dbo].[leads]  WITH CHECK ADD  CONSTRAINT [fk_leads_updated_by] FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[leads] CHECK CONSTRAINT [fk_leads_updated_by]
GO

ALTER TABLE [dbo].[lead_statuses]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_statuses]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[lead_statuses]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_sources]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_sources]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[lead_sources]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [fk_lead_followups_completed_by] FOREIGN KEY([completed_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [fk_lead_followups_completed_by]
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [fk_lead_followups_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [fk_lead_followups_created_by]
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [fk_lead_followups_lead] FOREIGN KEY([lead_id])
REFERENCES [dbo].[leads] ([id])
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [fk_lead_followups_lead]
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [fk_lead_followups_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [fk_lead_followups_tenant]
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [fk_lead_followups_updated_by] FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [fk_lead_followups_updated_by]
GO

ALTER TABLE [dbo].[homework_attachments]  WITH CHECK ADD  CONSTRAINT [fk_hw_attach_homework] FOREIGN KEY([homework_id])
REFERENCES [dbo].[homework] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[homework_attachments] CHECK CONSTRAINT [fk_hw_attach_homework]
GO

ALTER TABLE [dbo].[homework_attachments]  WITH CHECK ADD  CONSTRAINT [fk_hw_attach_uploaded_by] FOREIGN KEY([uploaded_by])
REFERENCES [dbo].[users] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[homework_attachments] CHECK CONSTRAINT [fk_hw_attach_uploaded_by]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_academic_year] FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_academic_year]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_class]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_created_by]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_division] FOREIGN KEY([class_division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_division]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_published_by] FOREIGN KEY([published_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_published_by]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_subject] FOREIGN KEY([subject_id])
REFERENCES [dbo].[subjects] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_subject]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_teacher] FOREIGN KEY([teacher_id])
REFERENCES [dbo].[teachers] ([id])
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_teacher]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [fk_homework_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [fk_homework_tenant]
GO

ALTER TABLE [dbo].[holidays]  WITH CHECK ADD  CONSTRAINT [FK_holidays_academic_year] FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[holidays] CHECK CONSTRAINT [FK_holidays_academic_year]
GO

ALTER TABLE [dbo].[holidays]  WITH CHECK ADD  CONSTRAINT [FK_holidays_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[holidays] CHECK CONSTRAINT [FK_holidays_tenant]
GO

ALTER TABLE [dbo].[holiday_targets]  WITH CHECK ADD  CONSTRAINT [FK_holiday_targets_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[holiday_targets] CHECK CONSTRAINT [FK_holiday_targets_class]
GO

ALTER TABLE [dbo].[holiday_targets]  WITH CHECK ADD  CONSTRAINT [FK_holiday_targets_division] FOREIGN KEY([division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[holiday_targets] CHECK CONSTRAINT [FK_holiday_targets_division]
GO

ALTER TABLE [dbo].[holiday_targets]  WITH CHECK ADD  CONSTRAINT [FK_holiday_targets_holiday] FOREIGN KEY([holiday_id])
REFERENCES [dbo].[holidays] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[holiday_targets] CHECK CONSTRAINT [FK_holiday_targets_holiday]
GO

ALTER TABLE [dbo].[holiday_targets]  WITH CHECK ADD  CONSTRAINT [FK_holiday_targets_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[holiday_targets] CHECK CONSTRAINT [FK_holiday_targets_tenant]
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([class_division_id])
REFERENCES [dbo].[class_divisions] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([fee_category_id])
REFERENCES [dbo].[fee_categories] ([id])
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[fee_structures]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_structure_categories]  WITH CHECK ADD  CONSTRAINT [fk_fsc_fee_category] FOREIGN KEY([fee_category_id])
REFERENCES [dbo].[fee_categories] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_structure_categories] CHECK CONSTRAINT [fk_fsc_fee_category]
GO

ALTER TABLE [dbo].[fee_structure_categories]  WITH CHECK ADD  CONSTRAINT [fk_fsc_fee_structure] FOREIGN KEY([fee_structure_id])
REFERENCES [dbo].[fee_structures] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_structure_categories] CHECK CONSTRAINT [fk_fsc_fee_structure]
GO

ALTER TABLE [dbo].[fee_receipts]  WITH CHECK ADD  CONSTRAINT [fk_fee_receipts_cancelled_by] FOREIGN KEY([cancelled_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_receipts] CHECK CONSTRAINT [fk_fee_receipts_cancelled_by]
GO

ALTER TABLE [dbo].[fee_receipts]  WITH CHECK ADD  CONSTRAINT [fk_fee_receipts_generated_by] FOREIGN KEY([generated_by])
REFERENCES [dbo].[users] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[fee_receipts] CHECK CONSTRAINT [fk_fee_receipts_generated_by]
GO

ALTER TABLE [dbo].[fee_receipts]  WITH CHECK ADD  CONSTRAINT [fk_fee_receipts_payment] FOREIGN KEY([payment_id])
REFERENCES [dbo].[fee_payments] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_receipts] CHECK CONSTRAINT [fk_fee_receipts_payment]
GO

ALTER TABLE [dbo].[fee_receipts]  WITH CHECK ADD  CONSTRAINT [fk_fee_receipts_student] FOREIGN KEY([student_id])
REFERENCES [dbo].[students] ([id])
GO

ALTER TABLE [dbo].[fee_receipts] CHECK CONSTRAINT [fk_fee_receipts_student]
GO

ALTER TABLE [dbo].[fee_receipts]  WITH CHECK ADD  CONSTRAINT [fk_fee_receipts_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_receipts] CHECK CONSTRAINT [fk_fee_receipts_tenant]
GO

ALTER TABLE [dbo].[fee_payments]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[fee_payments]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[fee_payments]  WITH CHECK ADD  CONSTRAINT [fk_fee_payments_academic_year] FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[fee_payments] CHECK CONSTRAINT [fk_fee_payments_academic_year]
GO

ALTER TABLE [dbo].[fee_payment_allocations]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[fee_payment_allocations]  WITH CHECK ADD FOREIGN KEY([fee_installment_id])
REFERENCES [dbo].[fee_installments] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_payment_allocations]  WITH CHECK ADD FOREIGN KEY([payment_id])
REFERENCES [dbo].[fee_payments] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_payment_allocations]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[fee_ledger]  WITH CHECK ADD  CONSTRAINT [fk_fee_ledger_academic_year] FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[fee_ledger] CHECK CONSTRAINT [fk_fee_ledger_academic_year]
GO

ALTER TABLE [dbo].[fee_ledger]  WITH CHECK ADD  CONSTRAINT [fk_fee_ledger_created_by] FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_ledger] CHECK CONSTRAINT [fk_fee_ledger_created_by]
GO

ALTER TABLE [dbo].[fee_ledger]  WITH CHECK ADD  CONSTRAINT [fk_fee_ledger_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[fee_ledger] CHECK CONSTRAINT [fk_fee_ledger_tenant]
GO

ALTER TABLE [dbo].[fee_ledger]  WITH CHECK ADD  CONSTRAINT [fk_fee_ledger_updated_by] FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_ledger] CHECK CONSTRAINT [fk_fee_ledger_updated_by]
GO

ALTER TABLE [dbo].[fee_installments]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_installments]  WITH CHECK ADD FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_installments]  WITH CHECK ADD FOREIGN KEY([fee_structure_id])
REFERENCES [dbo].[fee_structures] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_installments]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[fee_installments]  WITH CHECK ADD  CONSTRAINT [fk_fee_installments_fee_category] FOREIGN KEY([fee_category_id])
REFERENCES [dbo].[fee_categories] ([id])
GO

ALTER TABLE [dbo].[fee_installments] CHECK CONSTRAINT [fk_fee_installments_fee_category]
GO

ALTER TABLE [dbo].[fee_categories]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[fee_categories]  WITH CHECK ADD  CONSTRAINT [fk_fee_categories_academic_year] FOREIGN KEY([academic_year_id])
REFERENCES [dbo].[academic_years] ([id])
GO

ALTER TABLE [dbo].[fee_categories] CHECK CONSTRAINT [fk_fee_categories_academic_year]
GO

ALTER TABLE [dbo].[fee_categories]  WITH CHECK ADD  CONSTRAINT [fk_fee_categories_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[fee_categories] CHECK CONSTRAINT [fk_fee_categories_class]
GO

ALTER TABLE [dbo].[development_tasks]  WITH CHECK ADD  CONSTRAINT [fk_development_tasks_tenant] FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE SET NULL
GO

ALTER TABLE [dbo].[development_tasks] CHECK CONSTRAINT [fk_development_tasks_tenant]
GO

ALTER TABLE [dbo].[development_tasks]  WITH CHECK ADD  CONSTRAINT [fk_development_tasks_user_story] FOREIGN KEY([user_story_id])
REFERENCES [dbo].[user_stories] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[development_tasks] CHECK CONSTRAINT [fk_development_tasks_user_story]
GO

ALTER TABLE [dbo].[communication_notice_targets]  WITH CHECK ADD  CONSTRAINT [fk_notice_targets_class] FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[communication_notice_targets] CHECK CONSTRAINT [fk_notice_targets_class]
GO

ALTER TABLE [dbo].[communication_notice_targets]  WITH CHECK ADD  CONSTRAINT [fk_notice_targets_division] FOREIGN KEY([division_id])
REFERENCES [dbo].[class_divisions] ([id])
GO

ALTER TABLE [dbo].[communication_notice_targets] CHECK CONSTRAINT [fk_notice_targets_division]
GO

ALTER TABLE [dbo].[communication_notice_targets]  WITH CHECK ADD  CONSTRAINT [fk_notice_targets_notice] FOREIGN KEY([notice_id])
REFERENCES [dbo].[communication_notices] ([id])
GO

ALTER TABLE [dbo].[communication_notice_targets] CHECK CONSTRAINT [fk_notice_targets_notice]
GO

ALTER TABLE [dbo].[communication_notice_attachments]  WITH CHECK ADD  CONSTRAINT [fk_notice_attachments_notice] FOREIGN KEY([notice_id])
REFERENCES [dbo].[communication_notices] ([id])
GO

ALTER TABLE [dbo].[communication_notice_attachments] CHECK CONSTRAINT [fk_notice_attachments_notice]
GO

ALTER TABLE [dbo].[classes]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[classes]  WITH CHECK ADD FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[classes]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
GO

ALTER TABLE [dbo].[classes]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[class_divisions]  WITH CHECK ADD FOREIGN KEY([class_id])
REFERENCES [dbo].[classes] ([id])
GO

ALTER TABLE [dbo].[academic_years]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[academic_years]  WITH CHECK ADD FOREIGN KEY([deleted_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[academic_years]  WITH CHECK ADD FOREIGN KEY([tenant_id])
REFERENCES [dbo].[tenants] ([id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[academic_years]  WITH CHECK ADD FOREIGN KEY([updated_by])
REFERENCES [dbo].[users] ([id])
GO

ALTER TABLE [dbo].[user_stories]  WITH CHECK ADD  CONSTRAINT [CK_user_stories_review_status] CHECK  (([review_status]='rejected' OR [review_status]='approved' OR [review_status]='draft'))
GO

ALTER TABLE [dbo].[user_stories] CHECK CONSTRAINT [CK_user_stories_review_status]
GO

ALTER TABLE [dbo].[test_cases]  WITH CHECK ADD  CONSTRAINT [CK_test_cases_review_status] CHECK  (([review_status]='rejected' OR [review_status]='approved' OR [review_status]='draft'))
GO

ALTER TABLE [dbo].[test_cases] CHECK CONSTRAINT [CK_test_cases_review_status]
GO

ALTER TABLE [dbo].[setup_guides]  WITH CHECK ADD  CONSTRAINT [ck_sg_doc_type] CHECK  (([doc_type]='googledoc' OR [doc_type]='pdf' OR [doc_type] IS NULL))
GO

ALTER TABLE [dbo].[setup_guides] CHECK CONSTRAINT [ck_sg_doc_type]
GO

ALTER TABLE [dbo].[PT_Sprints]  WITH NOCHECK ADD  CONSTRAINT [CK_PT_Sprints_Completed_NotActive] CHECK  (([IsCompleted]=(0) OR [IsCompleted] IS NULL OR [IsActive]=(0) OR [IsActive] IS NULL))
GO

ALTER TABLE [dbo].[PT_Sprints] CHECK CONSTRAINT [CK_PT_Sprints_Completed_NotActive]
GO

ALTER TABLE [dbo].[menus]  WITH CHECK ADD  CONSTRAINT [ck_menus_hierarchy] CHECK  (([level]=(1) AND [parent_id] IS NULL OR [level]=(2) AND [parent_id] IS NOT NULL))
GO

ALTER TABLE [dbo].[menus] CHECK CONSTRAINT [ck_menus_hierarchy]
GO

ALTER TABLE [dbo].[menus]  WITH CHECK ADD  CONSTRAINT [ck_menus_level] CHECK  (([level]=(2) OR [level]=(1)))
GO

ALTER TABLE [dbo].[menus] CHECK CONSTRAINT [ck_menus_level]
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [ck_lead_followups_status] CHECK  (([followup_status]='Cancelled' OR [followup_status]='Completed' OR [followup_status]='Pending'))
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [ck_lead_followups_status]
GO

ALTER TABLE [dbo].[lead_followups]  WITH CHECK ADD  CONSTRAINT [ck_lead_followups_type] CHECK  (([followup_type]='WhatsApp' OR [followup_type]='Email' OR [followup_type]='Visit' OR [followup_type]='Call'))
GO

ALTER TABLE [dbo].[lead_followups] CHECK CONSTRAINT [ck_lead_followups_type]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [ck_homework_dates] CHECK  (([submission_date]>=[assigned_date]))
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [ck_homework_dates]
GO

ALTER TABLE [dbo].[homework]  WITH CHECK ADD  CONSTRAINT [ck_homework_status] CHECK  (([status]='published' OR [status]='draft'))
GO

ALTER TABLE [dbo].[homework] CHECK CONSTRAINT [ck_homework_status]
GO

ALTER TABLE [dbo].[holidays]  WITH CHECK ADD CHECK  (([holiday_type]='NON_TEACHING_DAY' OR [holiday_type]='ACADEMIC_BREAK' OR [holiday_type]='PUBLIC_HOLIDAY'))
GO

ALTER TABLE [dbo].[holiday_targets]  WITH CHECK ADD  CONSTRAINT [CK_holiday_targets_target_present] CHECK  (([class_id] IS NOT NULL OR [division_id] IS NOT NULL))
GO

ALTER TABLE [dbo].[holiday_targets] CHECK CONSTRAINT [CK_holiday_targets_target_present]
GO

ALTER TABLE [dbo].[communication_notices]  WITH CHECK ADD  CONSTRAINT [chk_audience_type] CHECK  (([audience_type]='ADMIN' OR [audience_type]='TEACHER' OR [audience_type]='STUDENT' OR [audience_type]='ALL'))
GO

ALTER TABLE [dbo].[communication_notices] CHECK CONSTRAINT [chk_audience_type]
GO

ALTER TABLE [dbo].[communication_notices]  WITH CHECK ADD  CONSTRAINT [chk_notice_dates] CHECK  (([expiry_date] IS NULL OR [expiry_date]>=[publish_date]))
GO

ALTER TABLE [dbo].[communication_notices] CHECK CONSTRAINT [chk_notice_dates]
GO

ALTER TABLE [dbo].[communication_notices]  WITH CHECK ADD  CONSTRAINT [chk_notice_status] CHECK  (([status]='EXPIRED' OR [status]='UNPUBLISHED' OR [status]='PUBLISHED' OR [status]='DRAFT'))
GO

ALTER TABLE [dbo].[communication_notices] CHECK CONSTRAINT [chk_notice_status]
GO

ALTER TABLE [dbo].[communication_notices]  WITH CHECK ADD  CONSTRAINT [chk_notice_type] CHECK  (([notice_type]='EXAM' OR [notice_type]='HOLIDAY' OR [notice_type]='EVENT' OR [notice_type]='FEE' OR [notice_type]='GENERAL'))
GO

ALTER TABLE [dbo].[communication_notices] CHECK CONSTRAINT [chk_notice_type]
GO

