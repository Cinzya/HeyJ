# Create Storage Buckets

The `message_audios` storage bucket needs to be created in your Supabase project.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ifmwepbepoujfnzisrjz
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Create a bucket with the following settings:
   - **Name**: `message_audios`
   - **Public bucket**: ✅ Checked (so messages can be accessed)
   - **File size limit**: Leave default or set as needed
   - **Allowed MIME types**: `audio/mpeg`, `audio/mp3`, `audio/m4a`, `audio/*` (or leave empty for all)
5. Click **Create bucket**

## Option 2: Via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase storage create message_audios --public
```

## Option 3: Via API (if you have service role key)

You can also create it programmatically using the Supabase Management API, but the dashboard method is easiest.

## Storage Policies

After creating the bucket, you may need to set up RLS policies. The bucket should be public for message audio files to be accessible.

