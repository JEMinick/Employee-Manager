DROP DATABASE IF EXISTS employeesDB;
CREATE database employeesDB;

USE employeesDB;

DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL,
  PRIMARY KEY (id)
);

DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(30) NOT NULL,
  salary DECIMAL(10,4) NULL,
  department_id INT NOT NULL,
  PRIMARY KEY (id)
);

DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
  id INT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(30) NOT NULL,
  last_name VARCHAR(30) NOT NULL,
  role_id INT NOT NULL,
  manager_id INT DEFAULT 0,
  PRIMARY KEY (id)
);

DROP TABLE IF EXISTS mgridlist;
CREATE TABLE mgridlist (
  mgrid INT NOT NULL,
  PRIMARY KEY (mgrid)
);
INSERT INTO mgridlist (mgrid) VALUES (0);
-- select * FROM mgridlist;

DROP TABLE IF EXISTS mgrinfo;
CREATE TABLE mgrinfo (
  mgrid INT NOT NULL,
  Manager VARCHAR(62),
  MgrRoleID INT,
  MgrTitle VARCHAR(30),
  MgrSalary DECIMAL(10,4),
  MgrDeptID INT,
  MgrDeptName VARCHAR(30),
  PRIMARY KEY (mgrid)
);
INSERT INTO mgrinfo (mgrid) VALUES (0);
-- select * from mgrinfo;
