import { useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, Tag, Input, Form, Modal, Select,
  Row, Col, message, Popconfirm,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, KeyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, useAuthStore } from '@erp/shared';
import { formatDateTime } from '@erp/shared';
import type { UserResponse, UserCreateRequest, UserUpdateRequest } from '@erp/shared';

const Users = () => {
  const queryClient = useQueryClient();
  const { permissions } = useAuthStore();
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchRealName, setSearchRealName] = useState('');
  const [searchStatus, setSearchStatus] = useState<number | undefined>(undefined);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string>('');
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const hasPermission = (perm: string) => permissions.includes(perm);

  // Query
  const { data, isLoading } = useQuery({
    queryKey: ['users', pageNum, pageSize, searchUsername, searchRealName, searchStatus],
    queryFn: () => userApi.list({
      pageNum,
      pageSize,
      username: searchUsername || undefined,
      realName: searchRealName || undefined,
      status: searchStatus,
    }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: UserCreateRequest) => userApi.create(data),
    onSuccess: () => {
      message.success('创建用户成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateRequest }) => userApi.update(id, data),
    onSuccess: () => {
      message.success('更新用户成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      message.success('删除用户成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      userApi.resetPassword(id, password),
    onSuccess: () => {
      message.success('密码重置成功');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const handleSearch = () => {
    setPageNum(1);
  };

  const handleReset = () => {
    setSearchUsername('');
    setSearchRealName('');
    setSearchStatus(undefined);
    setPageNum(1);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = useCallback((record: UserResponse) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      realName: record.realName,
      phone: record.phone,
      email: record.email,
      departmentId: record.departmentId,
      status: record.status,
      roleIds: record.roleIds,
    });
    setModalOpen(true);
  }, [form]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: values });
    } else {
      createMutation.mutate(values as UserCreateRequest);
    }
  };

  const openPasswordModal = (userId: string) => {
    setPasswordUserId(userId);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const handleResetPassword = async () => {
    const values = await passwordForm.validateFields();
    resetPasswordMutation.mutate({ id: passwordUserId, password: values.newPassword });
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'realName',
      key: 'realName',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '部门',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 100,
    },
    {
      title: '角色',
      dataIndex: 'roleNames',
      key: 'roleNames',
      width: 150,
      render: (roleNames: string[]) =>
        roleNames?.map((name) => <Tag key={name} color="blue">{name}</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'error'}>
          {status === 1 ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 170,
      render: (date: string) => date ? formatDateTime(date) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: UserResponse) => (
        <Space size="small">
          {hasPermission('system:user:update') && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              编辑
            </Button>
          )}
          {hasPermission('system:user:update') && (
            <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => openPasswordModal(record.id)}>
              重置密码
            </Button>
          )}
          {hasPermission('system:user:delete') && (
            <Popconfirm title="确定删除该用户吗？" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
          <Col>
            <Input
              placeholder="用户名"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 150 }}
              allowClear
            />
          </Col>
          <Col>
            <Input
              placeholder="姓名"
              value={searchRealName}
              onChange={(e) => setSearchRealName(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 150 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="状态"
              value={searchStatus}
              onChange={setSearchStatus}
              style={{ width: 120 }}
              allowClear
              options={[
                { label: '正常', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            {hasPermission('system:user:create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                新增用户
              </Button>
            )}
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data?.list || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pageNum,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
            onChange: (page: number, size: number) => {
              setPageNum(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 50, message: '用户名不能超过50个字符' },
            ]}
          >
            <Input disabled={!!editingUser} placeholder="请输入用户名" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码不能少于6位' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item name="realName" label="姓名" rules={[{ max: 50, message: '姓名不能超过50个字符' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="手机号">
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          {editingUser && (
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { label: '正常', value: 1 },
                  { label: '禁用', value: 0 },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title="重置密码"
        open={passwordModalOpen}
        onOk={handleResetPassword}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        confirmLoading={resetPasswordMutation.isPending}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" preserve={false}>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码不能少于6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Users;
