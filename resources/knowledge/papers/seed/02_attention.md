# Neural Machine Translation by Jointly Learning to Align and Translate

**作者**：Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio
**发表时间**：2014
**会议**：ICLR 2015
**arXiv**：https://arxiv.org/abs/1409.0473

## 摘要

本文提出了注意力机制（Attention Mechanism），让神经网络在翻译时能够"关注"源句子的不同部分。这是首个成功应用注意力机制的工作，成为了后续许多模型的基础。

## 核心贡献

1. **提出了注意力机制**：让模型在生成每个输出时关注源句子的不同部分
2. **解决了固定长度向量瓶颈**：传统 encoder-decoder 将整个句子压缩成固定长度向量
3. **提升了翻译质量**：在英法翻译任务上取得了 SOTA 结果

## 关键方法

### Encoder-Decoder 架构

```python
import torch
import torch.nn as nn

class Encoder(nn.Module):
    def __init__(self, input_size, embedding_size, hidden_size, n_layers=1):
        super(Encoder, self).__init__()
        self.hidden_size = hidden_size
        self.embedding = nn.Embedding(input_size, embedding_size)
        self.lstm = nn.LSTM(embedding_size, hidden_size, n_layers,
                          batch_first=True)

    def forward(self, x):
        # x: (batch_size, seq_len)
        embedded = self.embedding(x)  # (batch_size, seq_len, embedding_size)
        outputs, (hidden, cell) = self.lstm(embedded)
        return outputs, hidden, cell
```

### 注意力机制

```python
class Attention(nn.Module):
    def __init__(self, hidden_size):
        super(Attention, self).__init__()
        self.attn = nn.Linear(hidden_size * 3, hidden_size)
        self.v = nn.Linear(hidden_size, 1, bias=False)

    def forward(self, hidden, encoder_outputs):
        # hidden: (batch_size, hidden_size)
        # encoder_outputs: (batch_size, seq_len, hidden_size)

        batch_size = encoder_outputs.shape[0]
        src_len = encoder_outputs.shape[1]

        # 重复 decoder hidden state src_len 次
        hidden = hidden.unsqueeze(1).repeat(1, src_len, 1)

        # 计算注意力能量
        energy = torch.tanh(self.attn(
            torch.cat((hidden, encoder_outputs), dim=2)
        ))  # (batch_size, seq_len, hidden_size)

        attention = self.v(energy).squeeze(2)  # (batch_size, seq_len)

        # 应用 softmax 得到注意力权重
        return F.softmax(attention, dim=1)
```

### 带注意力的 Decoder

```python
class Decoder(nn.Module):
    def __init__(self, output_size, embedding_size, hidden_size, attention, n_layers=1):
        super(Decoder, self).__init__()
        self.output_size = output_size
        self.attention = attention
        self.embedding = nn.Embedding(output_size, embedding_size)
        self.lstm = nn.LSTM(hidden_size * 2 + embedding_size, hidden_size, n_layers,
                          batch_first=True)
        self.fc_out = nn.Linear(hidden_size * 2 + embedding_size + hidden_size, output_size)

    def forward(self, input, hidden, cell, encoder_outputs):
        # input: (batch_size, 1)
        input = input.unsqueeze(1)

        # 嵌入
        embedded = self.embedding(input)  # (batch_size, 1, embedding_size)

        # 计算注意力权重
        attn_weights = self.attention(hidden[-1], encoder_outputs)

        # 应用注意力权重到 encoder outputs
        attn_weights = attn_weights.unsqueeze(1)
        context = torch.bmm(attn_weights, encoder_outputs)

        # LSTM 输入
        lstm_input = torch.cat((embedded, context), dim=2)

        # LSTM
        output, (hidden, cell) = self.lstm(lstm_input, (hidden, cell))

        # 预测
        output = output.squeeze(1)
        context = context.squeeze(1)
        embedded = embedded.squeeze(1)

        prediction = self.fc_out(torch.cat((output, context, embedded), dim=1))

        return prediction, hidden, cell, attn_weights
```

## 注意力机制的关键步骤

1. **计算注意力分数**：衡量 decoder 状态与每个 encoder 状态的相关性
2. **归一化**：使用 softmax 将分数转换为权重
3. **加权求和**：用权重对 encoder 输出进行加权求和，得到上下文向量
4. **融合**：将上下文向量与 decoder 输入融合

## 常见实现错误

1. ❌ 忘记在时间维度上重复 hidden state
2. ❌ 注意力权重的维度不正确
3. ❌ 使用了错误的 softmax 维度
4. ❌ 上下文向量与 decoder 输入融合方式错误
5. ❌ 没有正确处理变长序列

## 代码审查要点

审查注意力机制代码时，检查：

- [ ] 注意力权重的计算是否正确
- [ ] softmax 是否在正确的维度上应用
- [ ] 上下文向量的计算是否正确
- [ ] 维度是否匹配（特别是 batch_first=True 时）
- [ ] 是否正确处理了变长序列
- [ ] 是否可以使用高效的矩阵乘法优化

## 适用场景

- 机器翻译
- 图像描述生成
- 语音识别
- 问答系统
- 文本摘要

## 后续发展

- **Self-Attention**：Transformer 中的核心机制
- **Multi-Head Attention**：多头注意力
- **Cross-Attention**：跨模态注意力
- **Sparse Attention**：稀疏注意力（Longformer, BigBird）

## 标签

#论文 #NLP #注意力机制 #Seq2Seq #机器翻译
