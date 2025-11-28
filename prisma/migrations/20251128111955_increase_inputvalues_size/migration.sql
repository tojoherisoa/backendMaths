BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [studentName] NVARCHAR(1000) NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NumberSequence] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionId] NVARCHAR(1000) NOT NULL,
    [inputValues] NVARCHAR(max) NOT NULL,
    [isDeterministic] BIT NOT NULL,
    [confidenceScore] FLOAT(53) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NumberSequence_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NumberSequence_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PredictionLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [sequenceId] NVARCHAR(1000) NOT NULL,
    [predictedValues] NVARCHAR(1000) NOT NULL,
    [actualNextValues] NVARCHAR(1000),
    [accuracy] FLOAT(53),
    CONSTRAINT [PredictionLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NumberSeries] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionId] NVARCHAR(1000) NOT NULL,
    [numbers] NVARCHAR(1000) NOT NULL,
    [source] NVARCHAR(1000) NOT NULL,
    [count] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NumberSeries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NumberSeries_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NumberSeries_sessionId_idx] ON [dbo].[NumberSeries]([sessionId]);

-- AddForeignKey
ALTER TABLE [dbo].[NumberSequence] ADD CONSTRAINT [NumberSequence_sessionId_fkey] FOREIGN KEY ([sessionId]) REFERENCES [dbo].[Session]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PredictionLog] ADD CONSTRAINT [PredictionLog_sequenceId_fkey] FOREIGN KEY ([sequenceId]) REFERENCES [dbo].[NumberSequence]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NumberSeries] ADD CONSTRAINT [NumberSeries_sessionId_fkey] FOREIGN KEY ([sessionId]) REFERENCES [dbo].[Session]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
