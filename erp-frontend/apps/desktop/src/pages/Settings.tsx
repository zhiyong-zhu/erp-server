import { Card, Form, Input, Button, Switch, Space, message } from 'antd';
import { useState } from 'react';

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // TODO: Save settings
      message.success('设置已保存');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>系统设置</h1>
      <Card title="打印设置" style={{ marginTop: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="printer" label="默认打印机">
            <Input placeholder="请选择打印机" />
          </Form.Item>
          <Form.Item name="autoPrint" label="自动打印" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="本地缓存" style={{ marginTop: 24 }}>
        <Space>
          <Button>清除缓存</Button>
          <Button>导出数据</Button>
          <Button>导入数据</Button>
        </Space>
      </Card>
    </div>
  );
};

export default Settings;
