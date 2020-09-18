'use strict';

const { promises: fs, existsSync } = require('fs');
const { uploadFile } = require('../lib/utills');
const moment = require('moment');
const Controller = require('egg').Controller;

const rule = {
  adminname: {
    required: true,
    type: 'string',
    min: 6,
  },
  password: {
    required: true,
    type: 'string',
    min: 8,
  },
};

class adminController extends Controller {
  // 后台首页
  async index() {
    const { ctx } = this;
    await ctx.render('admin/index.html');
  }
  // 后台欢迎页
  async welcome() {
    const { ctx } = this;
    await ctx.render('admin/welcome.html');
  }
  // 登录页
  async login() {
    const { ctx } = this;
    if (ctx.cookies.get('login')) {
      ctx.redirect('/admin');
    }
    await this.ctx.render('admin/login.html');
  }
  // 登录页处理
  async check() {
    const { ctx } = this;
    let { adminname, password, isAutoLogin } = ctx.request.body;
    ctx.validate(rule, ctx.request.body);
    const message = await ctx.service.login.index(adminname, password, isAutoLogin);
    if (message === '登陆成功') {
      ctx.cookies.set('login', moment().valueOf(), {
        httpOnly: true,
      });
      if (isAutoLogin) {
        // 七天自动登录
        ctx.cookies.set('login', moment().valueOf(), {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      ctx.ajaxSuccess(200, message);
    } else {
      ctx.ajaxFailed(200, message);
    }
  }
  // 退出登录
  async logout() {
    const { ctx } = this;
    ctx.cookies.set('login', null);
    ctx.body = '<script>alert("退出成功！");location.href="/admin/login";</script>';
  }
  // 博客分类管理页
  async blogLists() {
    const { ctx } = this;
    const rows = await ctx.service.blogtypes.findAll();
    await ctx.render('admin/blogstype/index.html', { rows });
  }
  // 添加博客分类页
  async addBlogLists() {
    const { ctx } = this;
    await ctx.render('admin/blogstype/add.html');
  }
  // 处理添加博客分类页
  async postAddBlogLists() {
    const { ctx } = this;
    const { name, sort } = ctx.request.body;
    try {
      await ctx.service.blogtypes.add(name, sort);
    } catch (error) {
      ctx.failed(error.toString());
      return false;
    }
    ctx.success('添加成功', 'location.href="/admin/blogstype"');
  }
  // 修改博客分类页
  async editBlogLists() {
    const { ctx } = this;
    const id = ctx.request.query.id;
    const rows = await ctx.service.blogtypes.find(id);
    await ctx.render('admin/blogstype/edit.html', { rows });
  }
  // 处理修改博客分类页
  async postEditBlogLists() {
    const { ctx } = this;
    const { name, sort, id } = ctx.request.body;
    try {
      await ctx.service.blogtypes.edit(name, sort, id);
    } catch (error) {
      ctx.failed(error.toString());
      return false;
    }
    ctx.success('修改成功', 'location.href="/admin/blogstype"');
  }
  // ajax删除博客分类页
  async deleteBlogLists() {
    const { ctx } = this;
    const id = ctx.request.query.id;
    try {
      const result = await ctx.service.blogtypes.delete(id);
      if (result.affectedRows !== 1) {
        ctx.ajaxFailed(200, '删除失败');
      }
      ctx.ajaxSuccess(200, '删除成功');
    } catch (error) {
      ctx.ajaxFailed(200, error.toString());
    }
  }
  // 博客管理页
  async blogs() {
    const { ctx } = this;
    const page = ctx.request.query.page ? ctx.request.query.page : 1;
    const { rows, show } = await ctx.service.blogs.find(page);
    await ctx.render('admin/blogs/index.html', { rows, show });
  }
  // 添加博客页
  async addBlog() {
    const { ctx } = this;
    const rows = await ctx.service.blogs.findTypes();
    await ctx.render('admin/blogs/add.html', { rows });
  }
  // 处理添加博客页
  async postAddBlog() {
    const { ctx } = this;
    const { type, title, keywords, description, author, cid, top, content } = ctx.request.body;
    const click = 0;
    const time = Math.round((new Date().getTime()) / 1000);
    const img = ctx.request.files[0];
    const newPath = await uploadFile(img);
    await ctx.service.blogs.postAdd(type, title, time, newPath, keywords, description, author, cid, top, content, click);
    ctx.success('添加成功！', 'location.href="/admin/blogs"');
  }
  // 修改博客页
  async editBlog() {
    const { ctx } = this;
    const id = ctx.request.query.id;
    const types = await ctx.service.blogs.findTypes();
    const rows = await ctx.service.blogs.edit(id);
    await ctx.render('admin/blogs/edit.html', {
      rows1: types,
      rows,
    });
  }
  // 处理修改博客页
  async postEditBlog() {
    const { ctx } = this;
    const { id, type, title, keywords, description, oldimg, author, cid, top, content } = ctx.request.body;
    let img = oldimg;
    const newImg = ctx.request.files[0];
    if (newImg) {
      img = await uploadFile(newImg);
      // 删除旧博客封面
      if (existsSync(__dirname + '/../' + oldimg)) {
        await fs.unlink(__dirname + '/../' + oldimg);
      }
    }
    await ctx.service.blogs.postEdit(id, type, title, keywords, description, img, author, cid, top, content);
    await ctx.success('修改成功！', 'location.href="/admin/blogs"');
  }
  // ajax删除博客页
  async deleteBlog() {
    const { ctx } = this;
    const { id, img } = ctx.request.query;
    const result = await ctx.service.blogs.delete(id);
    if (result.affectedRows !== 1) {
      ctx.ajaxFailed(200, '删除失败！');
    } else {
      if (existsSync(__dirname + '/../' + img)) {
        fs.unlink(__dirname + '/../' + img);
      }
      ctx.ajaxSuccess(200, '删除成功！');
    }
  }
  // 管理员管理页
  async admin() {
    const { ctx } = this;
    const search = ctx.request.query.search ? ctx.request.query.search : '';
    const rows = await ctx.service.admin.findAll(search);
    await ctx.render('admin/admin/index.html', {
      search,
      rows,
    });
  }
  // 添加管理员管理页
  async addAdmin() {
    await this.ctx.render('admin/admin/add.html');
  }
  // 处理添加管理员管理页
  async postAddAdmin() {
    const { ctx } = this;
    let { adminname, password, repassword } = ctx.request.body;
    // 前后端双重校验
    if (adminname) {
      if (adminname.length >= 6 && adminname.length <= 12) {
        if (password) {
          if (password === repassword) {
            const ErrorMessage = await ctx.service.admin.add(adminname, password);
            if (ErrorMessage) {
              ctx.failed(ErrorMessage);
              return false;
            }
            ctx.success('添加成功！', 'location.href="/admin/admin"');
          } else {
            ctx.failed('两次输入的密码不一致!');
            return false;
          }
        } else {
          ctx.failed('请输入密码!');
          return false;
        }
      } else {
        ctx.failed('管理员名长度在6到12位之间!');
        return false;
      }
    } else {
      ctx.failed('请输入管理员名!');
      return false;
    }
  }
  // 修改管理员管理页
  async editAdmin() {
    const { ctx } = this;
    const id = ctx.request.query.id;
    const rows = await ctx.service.admin.findOne(id);
    await ctx.render('admin/admin/edit.html', {
      rows,
    });
  }
  // 处理修改管理员修改页
  async postEditAdmin() {
    const { ctx } = this;
    const { id, adminname, password, repassword, status } = ctx.request.body;
    const ErrorMessage = await ctx.service.admin.edit(id, adminname, password, repassword, status);
    if (ErrorMessage) {
      ctx.failed(ErrorMessage);
    }
    ctx.success('修改成功', 'location.href="/admin/admin"');
  }
  // ajax删除管理员页
  async deleteAdmin() {
    const { ctx } = this;
    const id = ctx.request.query.id;
    const result = await ctx.service.admin.delete(id);
    if (result.affectedRows !== 1) {
      ctx.ajaxFailed(500, '删除失败！');
    }
    ctx.ajaxSuccess(200, '删除成功！');
  }
  // ajax修改管理员状态
  async changeStatus() {
    const { ctx } = this;
    const { id, status } = ctx.request.query;
    const result = await ctx.service.admin.change(id, status);
    if (result.affectedRows === 1) {
      ctx.ajaxSuccess(200, '修改成功！');
    }
  }
  // 评论管理页
  async comment() {
    const { ctx } = this;
    const page = ctx.request.query.page ? ctx.request.query.page : 1;
    const { result: comment, show } = await ctx.service.comments.find(page);
    await ctx.render('admin/comment/index.html', {
      comment,
      show,
    });
  }
  // ajax修改评论状态
  async editComment() {
    const { ctx } = this;
    const { id, status } = ctx.request.query;
    const result = await ctx.service.comments.edit(id, status);
    if (result.affectedRows !== 1) {
      ctx.ajaxFailed(500, '修改失败');
    }
    ctx.ajaxSuccess(200, '修改成功');

  }
  // 系统管理页
  async system() {
    const { ctx } = this;
    let fileBuffer = await fs.readFile(__dirname + '/../../config/config.system.json');
    let data = JSON.parse(fileBuffer.toString());
    await ctx.render('admin/system/index.html', { data });
  }
  // 处理系统管理页
  async postSystem() {
    const { ctx } = this;
    const { title, keywords, description, copyright, record, logo } = ctx.request.body;
    const file = ctx.request.files[0];
    let newlogo = '';
    if (file) {
      newlogo = await uploadFile(file);
    }
    const data = {
      title,
      keywords,
      description,
      copyright,
      record,
      logo: newlogo ? newlogo : logo,
    };
    await fs.writeFile(__dirname + '/../../config/config.system.json', JSON.stringify(data));
    if (file) {
      await fs.unlink(__dirname + '/..' + logo);
    }
    await ctx.success('修改成功！', 'location.href="/admin/system"');
  }
}

module.exports = adminController;